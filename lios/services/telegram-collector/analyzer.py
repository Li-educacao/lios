"""
Analysis engine — reads unanalyzed messages from Supabase, sends to Gemini 2.5 Pro,
and stores structured insights in tg_summaries, tg_insights, tg_notable_members.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger("analyzer")


def _get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


# ---------------------------------------------------------------------------
# Gemini prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Você é um analista de inteligência estratégica especializado em comunidades do Telegram.
Analise as mensagens fornecidas e retorne um objeto JSON com a seguinte estrutura.
Responda APENAS com JSON válido — sem markdown, sem explicações."""

ANALYSIS_PROMPT_TEMPLATE = """Analise as seguintes {message_count} mensagens do grupo Telegram "{group_name}" (período: {period_start} a {period_end}).

MENSAGENS:
{messages_text}

Retorne JSON com exatamente esta estrutura (sem campos extras, sem omissões):

{{
  "summary": "resumo geral do grupo em 2-3 parágrafos",
  "dominant_topics": ["tópico1", "tópico2", "tópico3"],
  "sentiment_overview": "positivo|neutro|negativo|misto",
  "activity_level": "alto|médio|baixo",
  "insights": [
    {{
      "category": "categoria (veja lista abaixo)",
      "title": "título curto do insight",
      "content": "descrição detalhada do insight",
      "relevance_score": 4,
      "tags": ["tag1", "tag2"],
      "evidence": "trecho ou exemplo que sustenta o insight"
    }}
  ],
  "notable_members": [
    {{
      "sender_id": 123456789,
      "role": "expert|influencer|questioner|connector|lurker",
      "contribution": "descrição da contribuição",
      "message_count": 12
    }}
  ],
  "relationship_map": [
    {{
      "from_sender_id": 111,
      "to_sender_id": 222,
      "interaction_count": 5,
      "interaction_type": "reply|mention|forward"
    }}
  ],
  "links": [
    {{
      "url": "https://...",
      "shared_by": 111,
      "context": "breve descrição do contexto",
      "category": "artigo|vídeo|ferramenta|documentação|outro"
    }}
  ],
  "polls_summary": [
    {{
      "question": "pergunta da enquete",
      "winner": "opção vencedora",
      "total_voters": 42
    }}
  ],
  "voice_insights": "síntese das mensagens de voz transcritas, ou null se nenhuma",
  "open_questions": ["pergunta sem resposta 1", "pergunta sem resposta 2"],
  "action_items": ["ação identificada 1", "ação identificada 2"],
  "emerging_conflicts": "descrição de tensões ou debates, ou null",
  "knowledge_gems": ["trecho de alto valor 1", "trecho de alto valor 2"],
  "memes_culture": "descrição de memes/linguagem interna do grupo, ou null"
}}

CATEGORIAS válidas para insights:
decisao_coletiva, aprendizado_tecnico, tendencia_mercado, oportunidade_negocio,
risco_identificado, recurso_compartilhado, consenso_formado, conflito_produtivo,
humor_grupo, lideranca_emergente, pauta_recorrente, conhecimento_tacito,
demanda_nao_atendida, feedback_produto, networking, evento_relevante,
mudanca_comportamento, insight_estrategico, curiosidade_cultural, outro"""


def _format_messages_for_prompt(messages: list[dict[str, Any]]) -> str:
    """Format message rows into a readable text block for the prompt."""
    lines: list[str] = []
    for msg in messages:
        parts: list[str] = []
        sent_at = msg.get("sent_at", "")[:16] if msg.get("sent_at") else "?"
        sender = msg.get("sender_id", "anon")
        parts.append(f"[{sent_at}] #{msg.get('message_id', '?')} sender={sender}")

        if msg.get("reply_to_msg_id"):
            parts.append(f"  -> reply to #{msg['reply_to_msg_id']}")
        if msg.get("forwarded_from"):
            fwd = msg["forwarded_from"]
            parts.append(f"  -> forwarded from {fwd.get('from_name', fwd)}")

        text = msg.get("text")
        if text:
            parts.append(f"  {text[:500]}")

        if msg.get("voice_transcription"):
            parts.append(f"  [VOZ] {msg['voice_transcription'][:400]}")

        if msg.get("poll"):
            poll = msg["poll"]
            q = poll.get("question", "")
            answers = ", ".join(
                f"{a['text']} ({a['voters']})" for a in poll.get("answers", [])
            )
            parts.append(f"  [ENQUETE] {q} | {answers}")

        if msg.get("reactions"):
            rxn = " ".join(f"{r['emoji']}x{r['count']}" for r in msg["reactions"])
            parts.append(f"  [REAÇÕES] {rxn}")

        lines.append("\n".join(parts))

    return "\n---\n".join(lines)


def _call_gemini(prompt: str) -> dict[str, Any]:
    """Send prompt to Gemini 2.5 Pro and parse JSON response."""
    api_key = os.environ["GEMINI_API_KEY"]
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-pro",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw)


def _get_unanalyzed_messages(supabase: Client, group_id: str, since: datetime | None) -> list[dict[str, Any]]:
    """Fetch messages that have not yet been analyzed for this group."""
    query = (
        supabase.table("tg_messages")
        .select(
            "id, message_id, sender_id, text, voice_transcription, poll, "
            "reactions, reply_to_msg_id, forwarded_from, sent_at, has_voice, has_media"
        )
        .eq("tg_group_id", group_id)
        .eq("is_analyzed", False)
        .order("sent_at", desc=False)
    )
    if since:
        query = query.gt("sent_at", since.isoformat())

    result = query.execute()
    return result.data or []


def _last_analysis_end(supabase: Client, group_id: str) -> datetime | None:
    """Return the period_end of the most recent summary for this group, if any."""
    result = (
        supabase.table("tg_summaries")
        .select("period_end")
        .eq("tg_group_id", group_id)
        .order("period_end", desc=True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return None
    raw = rows[0]["period_end"]
    return datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)


def _store_summary(
    supabase: Client,
    group_id: str,
    analysis: dict[str, Any],
    period_start: datetime,
    period_end: datetime,
    message_count: int,
) -> str:
    """Insert a tg_summaries record, return its id."""
    row = {
        "tg_group_id": group_id,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "message_count": message_count,
        "summary": analysis.get("summary"),
        "dominant_topics": analysis.get("dominant_topics"),
        "sentiment_overview": analysis.get("sentiment_overview"),
        "activity_level": analysis.get("activity_level"),
        "open_questions": analysis.get("open_questions"),
        "action_items": analysis.get("action_items"),
        "emerging_conflicts": analysis.get("emerging_conflicts"),
        "knowledge_gems": analysis.get("knowledge_gems"),
        "memes_culture": analysis.get("memes_culture"),
        "voice_insights": analysis.get("voice_insights"),
        "relationship_map": analysis.get("relationship_map"),
        "polls_summary": analysis.get("polls_summary"),
        "links": analysis.get("links"),
        "raw_analysis": analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("tg_summaries").insert(row).execute()
    return result.data[0]["id"]


def _store_insights(supabase: Client, group_id: str, summary_id: str, insights: list[dict[str, Any]]) -> None:
    """Insert tg_insights rows for each insight in the analysis."""
    if not insights:
        return
    rows = [
        {
            "tg_group_id": group_id,
            "tg_summary_id": summary_id,
            "category": item.get("category"),
            "title": item.get("title"),
            "content": item.get("content"),
            "relevance_score": item.get("relevance_score"),
            "tags": item.get("tags"),
            "evidence": item.get("evidence"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        for item in insights
    ]
    supabase.table("tg_insights").insert(rows).execute()
    logger.info("Stored %d insights for summary %s", len(rows), summary_id)


def _upsert_notable_members(
    supabase: Client, group_id: str, members: list[dict[str, Any]]
) -> None:
    """Upsert tg_notable_members — increments message_count on conflict."""
    if not members:
        return
    for member in members:
        sender_id = member.get("sender_id")
        if not sender_id:
            continue
        # Check if record exists
        existing = (
            supabase.table("tg_notable_members")
            .select("id, message_count")
            .eq("tg_group_id", group_id)
            .eq("sender_id", sender_id)
            .execute()
        )
        if existing.data:
            current_count = existing.data[0]["message_count"] or 0
            supabase.table("tg_notable_members").update(
                {
                    "role": member.get("role"),
                    "contribution": member.get("contribution"),
                    "message_count": current_count + (member.get("message_count") or 0),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("tg_notable_members").insert(
                {
                    "tg_group_id": group_id,
                    "sender_id": sender_id,
                    "role": member.get("role"),
                    "contribution": member.get("contribution"),
                    "message_count": member.get("message_count") or 0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).execute()


def _mark_messages_analyzed(supabase: Client, message_ids: list[str]) -> None:
    """Set is_analyzed=true on processed messages."""
    if not message_ids:
        return
    chunk_size = 500
    for i in range(0, len(message_ids), chunk_size):
        chunk = message_ids[i : i + chunk_size]
        supabase.table("tg_messages").update({"is_analyzed": True}).in_("id", chunk).execute()


def run_analysis() -> None:
    """Main analysis cycle — analyze unprocessed messages for all active groups."""
    supabase = _get_supabase()

    result = (
        supabase.table("tg_groups")
        .select("id, name, telegram_id")
        .eq("is_active", True)
        .execute()
    )
    groups = result.data or []

    if not groups:
        logger.info("No active groups to analyze")
        return

    logger.info("Starting analysis for %d groups", len(groups))

    for group in groups:
        group_id: str = group["id"]
        group_name: str = group.get("name") or group["telegram_id"]

        last_end = _last_analysis_end(supabase, group_id)
        messages = _get_unanalyzed_messages(supabase, group_id, last_end)

        if not messages:
            logger.info("Group %s — no new messages to analyze", group_name)
            continue

        logger.info("Group %s — analyzing %d messages", group_name, len(messages))

        sent_dates = [
            datetime.fromisoformat(m["sent_at"]).replace(tzinfo=timezone.utc)
            for m in messages
            if m.get("sent_at")
        ]
        period_start = min(sent_dates) if sent_dates else datetime.now(timezone.utc)
        period_end = max(sent_dates) if sent_dates else datetime.now(timezone.utc)

        messages_text = _format_messages_for_prompt(messages)
        # Escape braces in user-generated content before .format() to avoid KeyError
        safe_messages_text = messages_text.replace("{", "{{").replace("}", "}}")
        prompt = ANALYSIS_PROMPT_TEMPLATE.format(
            message_count=len(messages),
            group_name=group_name.replace("{", "{{").replace("}", "}}"),
            period_start=period_start.strftime("%Y-%m-%d"),
            period_end=period_end.strftime("%Y-%m-%d"),
            messages_text=safe_messages_text,
        )

        try:
            analysis = _call_gemini(prompt)
        except json.JSONDecodeError:
            logger.exception("Gemini returned invalid JSON for group %s", group_name)
            continue
        except Exception:
            logger.exception("Gemini API error for group %s", group_name)
            continue

        try:
            summary_id = _store_summary(
                supabase, group_id, analysis, period_start, period_end, len(messages)
            )
            _store_insights(supabase, group_id, summary_id, analysis.get("insights", []))
            _upsert_notable_members(supabase, group_id, analysis.get("notable_members", []))
            message_ids = [m["id"] for m in messages]
            _mark_messages_analyzed(supabase, message_ids)
            logger.info("Group %s — analysis stored (summary %s)", group_name, summary_id)
        except Exception:
            logger.exception("Failed to store analysis for group %s", group_name)

    logger.info("Analysis cycle complete")
