"""
Telegram Collector — fetches messages from monitored groups and stores in Supabase.

Runs on a schedule. First run per group fetches up to HISTORY_DAYS of history.
Subsequent runs fetch only messages newer than last_collected_at.
"""

import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client
from telethon import TelegramClient
from telethon.errors import FloodWaitError, ChannelPrivateError, UserNotParticipantError
from telethon.tl.types import (
    MessageMediaDocument,
    MessageMediaPhoto,
    MessageMediaPoll,
    MessageService,
    DocumentAttributeAudio,
    DocumentAttributeVideo,
    PeerChannel,
    PeerChat,
    PeerUser,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("collector")

HISTORY_DAYS: int = int(os.getenv("HISTORY_DAYS", "30"))


def _get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def _make_client() -> TelegramClient:
    api_id = int(os.environ["TELEGRAM_API_ID"])
    api_hash = os.environ["TELEGRAM_API_HASH"]
    # Session file stored next to the script so it persists between runs
    session_path = os.path.join(os.path.dirname(__file__), "lios_collector")
    return TelegramClient(session_path, api_id, api_hash)


def _classify_media(message: Any) -> tuple[bool, bool, bool]:
    """Return (has_media, has_voice, has_document)."""
    if message.media is None:
        return False, False, False
    if isinstance(message.media, MessageMediaPhoto):
        return True, False, False
    if isinstance(message.media, MessageMediaDocument):
        doc = message.media.document
        is_voice = any(
            isinstance(attr, DocumentAttributeAudio) and getattr(attr, "voice", False)
            for attr in (doc.attributes or [])
        )
        is_video_note = any(
            isinstance(attr, DocumentAttributeVideo) and getattr(attr, "round_message", False)
            for attr in (doc.attributes or [])
        )
        return True, is_voice or is_video_note, not (is_voice or is_video_note)
    if isinstance(message.media, MessageMediaPoll):
        return False, False, False
    return True, False, False


def _extract_poll(message: Any) -> dict[str, Any] | None:
    """Extract poll data if message contains a poll."""
    if not isinstance(message.media, MessageMediaPoll):
        return None
    poll = message.media.poll
    results = message.media.results
    answers = []
    for i, answer in enumerate(poll.answers):
        voters = 0
        if results and results.results and i < len(results.results):
            voters = results.results[i].voters or 0
        answers.append({"text": answer.text, "voters": voters})
    return {
        "question": poll.question,
        "answers": answers,
        "total_voters": results.total_voters if results else 0,
        "closed": getattr(poll, "closed", False),
    }


def _extract_reactions(message: Any) -> list[dict[str, Any]]:
    """Extract reaction counts from a message."""
    reactions = []
    if not message.reactions:
        return reactions
    for result in (message.reactions.results or []):
        emoji = getattr(result.reaction, "emoticon", None)
        if emoji:
            reactions.append({"emoji": emoji, "count": result.count})
    return reactions


def _get_voice_transcription(message: Any) -> str | None:
    """Return voice transcription text if available (Telegram Premium feature)."""
    # Telethon exposes voice transcription via message.voice_note_transcription
    # or through message.action on some builds. Check both paths.
    transcription = getattr(message, "voice_note_transcription", None)
    if transcription:
        return transcription.text

    # Some Telethon versions place it directly as an attribute on the message object
    if hasattr(message, "peer_id"):
        raw = getattr(message, "_", None)
        if raw == "Message":
            voice_transcription = getattr(message, "voice_transcription", None)
            if voice_transcription:
                return getattr(voice_transcription, "text", None)
    return None


def _sender_id(message: Any) -> int | None:
    """Resolve numeric sender ID from message, handling channels and users."""
    if message.sender_id is not None:
        return message.sender_id
    if message.from_id is None:
        return None
    peer = message.from_id
    if isinstance(peer, PeerUser):
        return peer.user_id
    if isinstance(peer, PeerChannel):
        return peer.channel_id
    if isinstance(peer, PeerChat):
        return peer.chat_id
    return None


def _forward_info(message: Any) -> dict[str, Any] | None:
    """Extract forward metadata from a message."""
    if not message.fwd_from:
        return None
    fwd = message.fwd_from
    info: dict[str, Any] = {}
    if fwd.from_id:
        peer = fwd.from_id
        if isinstance(peer, PeerUser):
            info["from_user_id"] = peer.user_id
        elif isinstance(peer, PeerChannel):
            info["from_channel_id"] = peer.channel_id
    if fwd.from_name:
        info["from_name"] = fwd.from_name
    if fwd.channel_post:
        info["original_post_id"] = fwd.channel_post
    return info if info else None


def _build_row(group_id: str, message: Any) -> dict[str, Any] | None:
    """Convert a Telethon Message object into a tg_messages insert dict.

    Returns None if the message should be skipped (service message, empty, etc.).
    """
    if isinstance(message, MessageService):
        return None
    if message.text is None and message.media is None:
        return None

    has_media, has_voice, has_document = _classify_media(message)
    poll_data = _extract_poll(message)
    reactions = _extract_reactions(message)
    transcription = _get_voice_transcription(message) if has_voice else None

    # Determine message_type
    if poll_data:
        msg_type = "poll"
    elif has_voice:
        msg_type = "voice"
    elif message.fwd_from:
        msg_type = "forward"
    elif isinstance(message.media, MessageMediaPhoto):
        msg_type = "photo"
    elif has_document:
        msg_type = "document"
    elif message.sticker:
        msg_type = "sticker"
    else:
        msg_type = "text"

    # Resolve sender name
    sender_name = None
    if message.sender:
        first = getattr(message.sender, "first_name", "") or ""
        last = getattr(message.sender, "last_name", "") or ""
        sender_name = f"{first} {last}".strip() or getattr(message.sender, "title", None)

    # Forward info as text
    fwd_text = None
    if message.fwd_from:
        fwd = message.fwd_from
        fwd_text = fwd.from_name or ""
        if fwd.from_id:
            if isinstance(fwd.from_id, PeerChannel):
                fwd_text = fwd_text or f"channel:{fwd.from_id.channel_id}"
            elif isinstance(fwd.from_id, PeerUser):
                fwd_text = fwd_text or f"user:{fwd.from_id.user_id}"

    row: dict[str, Any] = {
        "group_id": group_id,
        "telegram_msg_id": message.id,
        "sender_name": sender_name,
        "sender_telegram_id": _sender_id(message),
        "message_text": message.text or None,
        "voice_transcription": transcription,
        "message_type": msg_type,
        "reply_to_msg_id": message.reply_to.reply_to_msg_id if message.reply_to else None,
        "forwarded_from": fwd_text,
        "has_media": has_media,
        "poll_question": poll_data["question"] if poll_data else None,
        "poll_options": poll_data["answers"] if poll_data else None,
        "reactions": reactions if reactions else None,
        "sent_at": message.date.isoformat() if message.date else None,
    }
    return row


async def _fetch_group_messages(
    client: TelegramClient,
    group_db_id: str,
    telegram_id: str,
    last_collected_at: datetime | None,
) -> list[dict[str, Any]]:
    """Fetch messages from one Telegram group/channel.

    If last_collected_at is None (first run), fetches up to HISTORY_DAYS of history.
    Otherwise fetches only messages newer than last_collected_at.
    """
    cutoff = last_collected_at
    if cutoff is None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=HISTORY_DAYS)

    rows: list[dict[str, Any]] = []
    batch_size = 200

    try:
        entity = await client.get_entity(telegram_id)
    except (ValueError, ChannelPrivateError, UserNotParticipantError) as exc:
        logger.error("Cannot access group %s: %s", telegram_id, exc)
        return rows

    logger.info("Fetching messages from %s newer than %s", telegram_id, cutoff.isoformat())

    offset_id = 0
    while True:
        try:
            messages = await client.get_messages(
                entity,
                limit=batch_size,
                offset_id=offset_id,
                reverse=False,  # newest first, we stop when we go past cutoff
            )
        except FloodWaitError as exc:
            wait = exc.seconds
            logger.warning("FloodWait — sleeping %s seconds", wait)
            await asyncio.sleep(wait)
            continue

        if not messages:
            break

        reached_cutoff = False
        for msg in messages:
            if msg.date and msg.date.replace(tzinfo=timezone.utc) <= cutoff:
                reached_cutoff = True
                break
            row = _build_row(group_db_id, msg)
            if row:
                rows.append(row)

        if reached_cutoff or len(messages) < batch_size:
            break

        offset_id = messages[-1].id

    logger.info("Collected %d messages from %s", len(rows), telegram_id)
    return rows


async def _upsert_messages(supabase: Client, rows: list[dict[str, Any]]) -> None:
    """Upsert message rows into tg_messages.

    Uses (tg_group_id, message_id) as the conflict target so re-runs are idempotent.
    Processes in chunks of 500 to stay within Supabase payload limits.
    """
    chunk_size = 500
    total = len(rows)
    for i in range(0, total, chunk_size):
        chunk = rows[i : i + chunk_size]
        supabase.table("tg_messages").upsert(
            chunk,
            on_conflict="group_id,telegram_msg_id",
        ).execute()
        logger.info("Upserted chunk %d/%d (%d rows)", i // chunk_size + 1, -(-total // chunk_size), len(chunk))


def _update_last_collected(supabase: Client, group_db_id: str) -> None:
    supabase.table("tg_groups").update(
        {"last_collected_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", group_db_id).execute()


async def run_collection(client: TelegramClient) -> None:
    """Main collection cycle — fetch messages for all active groups."""
    supabase = _get_supabase()

    result = (
        supabase.table("tg_groups")
        .select("id, telegram_id, last_collected_at")
        .eq("is_active", True)
        .execute()
    )
    groups = result.data or []

    if not groups:
        logger.info("No active groups to collect from")
        return

    logger.info("Starting collection for %d groups", len(groups))

    for group in groups:
        group_db_id: str = group["id"]
        telegram_id: str = group["telegram_id"]
        raw_ts = group.get("last_collected_at")
        last_collected_at: datetime | None = None
        if raw_ts:
            last_collected_at = datetime.fromisoformat(raw_ts).replace(tzinfo=timezone.utc)

        try:
            rows = await _fetch_group_messages(client, group_db_id, telegram_id, last_collected_at)
            if rows:
                await _upsert_messages(supabase, rows)
            _update_last_collected(supabase, group_db_id)
            logger.info("Group %s — done. %d messages stored.", telegram_id, len(rows))
        except Exception:
            logger.exception("Unexpected error collecting group %s", telegram_id)

    logger.info("Collection cycle complete")
