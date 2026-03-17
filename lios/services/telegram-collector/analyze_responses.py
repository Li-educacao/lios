#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Response analysis — pairs questions with first responses to calculate real SLA metrics.

Identifies questions (messages with ?) in Telegram groups, finds who responded first
via reply_to_msg_id threading, and classifies responder as support (Waldeir) vs community.

Usage:
    venv/bin/python analyze_responses.py
"""

import os
import json
from collections import defaultdict
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("../../.env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Support staff identification:
# - "Prof. Waldeir (Suporte)" — main account, posts as channel admin (telegram_id=NULL)
# - Also posts with telegram_id=7052154409 (personal account, rare)
# - "Suporte - Eletrônica Para Climatização" — secondary support account
# - Any sender with NULL telegram_id in these groups = Waldeir (only admin)
SUPPORT_NAMES = ["waldeir", "suporte", "climatização"]
SUPPORT_TELEGRAM_IDS = {7052154409}

GROUPS = {
    "start": "b4d31f2b-d399-4af6-93f2-ddfa504d2774",
    "expert": "4577f638-5747-4fa9-bc82-1b91de053323",
}

BATCH_SIZE = 1000


def fetch_all_messages(sb, group_id):
    """Fetch all messages for a group in batches."""
    all_msgs = []
    offset = 0
    while True:
        result = (
            sb.table("tg_messages")
            .select("telegram_msg_id, sender_name, sender_telegram_id, message_text, reply_to_msg_id, sent_at, message_type")
            .eq("group_id", group_id)
            .order("sent_at")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        batch = result.data or []
        all_msgs.extend(batch)
        if len(batch) < BATCH_SIZE:
            break
        offset += BATCH_SIZE
        print(f"  fetched {len(all_msgs)} messages...")
    return all_msgs


def is_support(msg):
    """Check if message sender is support staff (Waldeir).

    Waldeir posts as channel admin in multiple ways:
    - sender_name="Prof. Waldeir (Suporte)" with telegram_id=NULL (older messages)
    - sender_name=None with telegram_id=None (newer messages, anonymous admin)
    - sender_name="Suporte - Eletrônica Para Climatização" (secondary account)
    - Personal account with telegram_id=7052154409 (rare)

    Rule: ANY message with NULL telegram_id = channel admin = Waldeir
    (he is the only admin who posts in these groups)
    """
    name = msg.get("sender_name") or ""
    tid = msg.get("sender_telegram_id")

    # NULL telegram_id = channel admin = Waldeir (only admin in these groups)
    # This catches both named ("Prof. Waldeir") and anonymous (None) admin posts
    if tid is None:
        return True

    # Known support telegram IDs
    if tid in SUPPORT_TELEGRAM_IDS:
        return True

    # Name-based match
    name_lower = name.lower()
    return any(s in name_lower for s in SUPPORT_NAMES)


def is_student_message(msg):
    """Check if a message is a substantive student message worth responding to.

    Includes text messages, photos (of defective boards), voice notes, and
    documents — anything a student might send seeking help.
    """
    if is_support(msg):
        return False

    msg_type = msg.get("message_type", "")

    # Skip stickers, forwards, polls — not help requests
    if msg_type in ("sticker", "forward", "poll"):
        return False

    text = msg.get("message_text") or ""

    # Text messages: need some substance (not just "ok", emojis, etc.)
    if msg_type == "text":
        clean = text.strip()
        if len(clean) < 3:
            return False
        # Skip pure greeting/acknowledgment
        ack_words = {"ok", "obrigado", "obg", "vlw", "valeu", "entendi", "certo",
                     "sim", "não", "top", "show", "boa", "blz", "beleza", "tmj"}
        if clean.lower().rstrip(".!,") in ack_words:
            return False
        return True

    # Photos, voice, video, documents — students send board photos, voice questions
    if msg_type in ("photo", "voice", "video", "document"):
        return True

    return False


def parse_dt(iso_str):
    """Parse ISO datetime string."""
    if not iso_str:
        return None
    # Handle timezone offset format
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))


def analyze_group(sb, group_name, group_id):
    """Analyze question-response patterns for one group."""
    print(f"\n{'='*60}")
    print(f"Analyzing: {group_name} ({group_id})")
    print(f"{'='*60}")

    messages = fetch_all_messages(sb, group_id)
    print(f"Total messages: {len(messages)}")

    # Index messages by telegram_msg_id for quick lookup
    msg_index = {}
    for m in messages:
        msg_index[m["telegram_msg_id"]] = m

    # Find student messages (any substantive non-support message)
    questions = [m for m in messages if is_student_message(m)]
    print(f"Student messages identified: {len(questions)}")

    # Detect topic-based group (Telegram Forum): many messages share the same
    # reply_to_msg_id pointing to a low-numbered topic root.
    reply_to_counts = defaultdict(int)
    for m in messages:
        if m["reply_to_msg_id"]:
            reply_to_counts[m["reply_to_msg_id"]] += 1

    # Topic IDs are reply_to values referenced by 20+ messages
    topic_ids = {rid for rid, cnt in reply_to_counts.items() if cnt >= 20}
    is_forum = len(topic_ids) > 0

    if is_forum:
        print(f"Forum group detected: {len(topic_ids)} topics identified")

    # Build topic-based index: topic_id -> [messages sorted by time]
    msgs_by_topic = defaultdict(list)
    for m in messages:
        topic = m.get("reply_to_msg_id")
        if topic and topic in topic_ids:
            msgs_by_topic[topic].append(m)

    for tid in msgs_by_topic:
        msgs_by_topic[tid].sort(key=lambda x: x["sent_at"] or "")

    # Build reply index for non-topic replies
    replies_by_parent = defaultdict(list)
    for m in messages:
        rid = m["reply_to_msg_id"]
        if rid and rid not in topic_ids:
            replies_by_parent[rid].append(m)

    for parent_id in replies_by_parent:
        replies_by_parent[parent_id].sort(key=lambda x: x["sent_at"] or "")

    # Sequential index
    msg_by_idx = {m["telegram_msg_id"]: i for i, m in enumerate(messages)}

    # Topic-level index: within a topic, map msg position
    topic_msg_idx = {}
    for tid, tmsgs in msgs_by_topic.items():
        for pos, m in enumerate(tmsgs):
            topic_msg_idx[m["telegram_msg_id"]] = (tid, pos)

    def find_first_response(q):
        """Find first response to a student message.

        Strategies (in priority order):
        1. Direct reply to this message (reply_to_msg_id = q's telegram_msg_id)
        2. Next message in same topic from a different person (24h window)
        3. Sequential fallback for non-forum groups (2h window)
        """
        q_msg_id = q["telegram_msg_id"]
        q_sender = q["sender_name"]
        q_time = parse_dt(q["sent_at"])
        if not q_time:
            return None

        candidates = []

        # Strategy 1: Direct reply to this specific message (highest confidence)
        replies = replies_by_parent.get(q_msg_id, [])
        for r in replies:
            if r["sender_name"] != q_sender:
                candidates.append(r)
                break

        # Strategy 2: Same topic — next message from different person (24h window)
        topic_info = topic_msg_idx.get(q_msg_id)
        if topic_info:
            tid, pos = topic_info
            topic_msgs = msgs_by_topic[tid]
            for j in range(pos + 1, min(pos + 50, len(topic_msgs))):
                m = topic_msgs[j]
                if m["sender_name"] == q_sender:
                    continue
                m_time = parse_dt(m["sent_at"])
                if not m_time:
                    continue
                delta = (m_time - q_time).total_seconds() / 60
                if delta > 1440:  # 24h
                    break
                candidates.append(m)
                break

        # Strategy 3: Sequential fallback for non-forum groups
        if not candidates and not is_forum:
            idx = msg_by_idx.get(q_msg_id)
            if idx is not None:
                for j in range(idx + 1, min(idx + 10, len(messages))):
                    m = messages[j]
                    if m["sender_name"] == q_sender:
                        continue
                    m_time = parse_dt(m["sent_at"])
                    if not m_time:
                        continue
                    delta = (m_time - q_time).total_seconds() / 60
                    if delta > 120:
                        break
                    if m["reply_to_msg_id"] and m["reply_to_msg_id"] != q_msg_id:
                        continue
                    candidates.append(m)
                    break

        if not candidates:
            return None

        # Pick the earliest candidate
        candidates.sort(key=lambda x: x["sent_at"] or "")
        return candidates[0]

    # Analyze each question
    support_first = 0
    community_first = 0
    no_reply = 0
    self_reply = 0
    response_times_support = []
    response_times_community = []

    for q in questions:
        q_time = parse_dt(q["sent_at"])
        first_reply = find_first_response(q)

        if not first_reply:
            # Check if only self-reply exists
            q_msg_id = q["telegram_msg_id"]
            replies = replies_by_parent.get(q_msg_id, [])
            if replies and all(r["sender_name"] == q["sender_name"] for r in replies):
                self_reply += 1
            else:
                no_reply += 1
            continue

        r_time = parse_dt(first_reply["sent_at"])
        if not q_time or not r_time:
            continue

        delta_min = (r_time - q_time).total_seconds() / 60

        # Skip negative deltas or unreasonably long (> 7 days)
        if delta_min < 0 or delta_min > 10080:
            continue

        if is_support(first_reply):
            support_first += 1
            response_times_support.append(delta_min)
        else:
            community_first += 1
            response_times_community.append(delta_min)

    total_answered = support_first + community_first
    support_pct = round(support_first / total_answered * 100) if total_answered > 0 else 0
    community_pct = round(community_first / total_answered * 100) if total_answered > 0 else 0

    # Calculate medians
    def median(lst):
        if not lst:
            return 0
        s = sorted(lst)
        n = len(s)
        mid = n // 2
        return round(s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2)

    # Split by weekday/weekend
    def split_by_day(questions_list, times_list, messages_list):
        weekday_times = []
        weekend_times = []
        commercial_times = []  # Mon-Fri 8h-18h
        for i, q in enumerate(questions_list):
            if i >= len(times_list):
                break
            q_time = parse_dt(q["sent_at"])
            if not q_time:
                continue
            t = times_list[i]
            if q_time.weekday() < 5:  # Mon-Fri
                weekday_times.append(t)
                if 8 <= q_time.hour < 18:
                    commercial_times.append(t)
            else:
                weekend_times.append(t)
        return weekday_times, weekend_times, commercial_times

    print(f"\n--- Results ---")
    print(f"Questions with replies: {total_answered}")
    print(f"Questions without replies: {no_reply}")
    print(f"Questions with only self-reply: {self_reply}")
    print(f"\nFirst responder:")
    print(f"  Support (Waldeir): {support_first} ({support_pct}%)")
    print(f"  Community:         {community_first} ({community_pct}%)")
    print(f"\nResponse time (median):")
    print(f"  Support:   {median(response_times_support)} min")
    print(f"  Community: {median(response_times_community)} min")

    # Weekday/Weekend breakdown for support responses
    # We need to rebuild this more carefully - track per-question
    support_weekday = []
    support_weekend = []
    support_commercial = []
    community_weekday = []
    community_weekend = []
    community_commercial = []

    for q in questions:
        q_time = parse_dt(q["sent_at"])
        if not q_time:
            continue

        first_reply = find_first_response(q)
        if not first_reply:
            continue

        r_time = parse_dt(first_reply["sent_at"])
        if not r_time:
            continue

        delta_min = (r_time - q_time).total_seconds() / 60
        if delta_min < 0 or delta_min > 10080:
            continue

        is_weekday = q_time.weekday() < 5
        is_commercial_hour = is_weekday and 8 <= q_time.hour < 18

        if is_support(first_reply):
            if is_weekday:
                support_weekday.append(delta_min)
                if is_commercial_hour:
                    support_commercial.append(delta_min)
            else:
                support_weekend.append(delta_min)
        else:
            if is_weekday:
                community_weekday.append(delta_min)
                if is_commercial_hour:
                    community_commercial.append(delta_min)
            else:
                community_weekend.append(delta_min)

    print(f"\n--- Detailed Response Times (median minutes) ---")
    print(f"  Support weekday:    {median(support_weekday)} min (n={len(support_weekday)})")
    print(f"  Support weekend:    {median(support_weekend)} min (n={len(support_weekend)})")
    print(f"  Support commercial: {median(support_commercial)} min (n={len(support_commercial)})")
    print(f"  Community weekday:  {median(community_weekday)} min (n={len(community_weekday)})")
    print(f"  Community weekend:  {median(community_weekend)} min (n={len(community_weekend)})")
    print(f"  Community commercial: {median(community_commercial)} min (n={len(community_commercial)})")

    # Support daily response rate
    support_dates = defaultdict(int)
    for q in questions:
        first_reply = find_first_response(q)
        if first_reply and is_support(first_reply):
            r_time = parse_dt(first_reply["sent_at"])
            if r_time:
                support_dates[r_time.strftime("%Y-%m-%d")] += 1

    if support_dates:
        daily_counts = list(support_dates.values())
        avg_daily = round(sum(daily_counts) / len(daily_counts), 1)
        max_daily = max(daily_counts)
        min_daily = min(daily_counts)
        active_days = len(daily_counts)
        print(f"\n--- Support (Waldeir) daily response rate ---")
        print(f"  Active days: {active_days}")
        print(f"  Avg responses/day: {avg_daily}")
        print(f"  Max: {max_daily} | Min: {min_daily}")
    else:
        avg_daily = 0
        active_days = 0

    return {
        "group": group_name,
        "total_questions": len(questions),
        "answered": total_answered,
        "no_reply": no_reply,
        "self_reply": self_reply,
        "support_first": support_first,
        "support_first_pct": support_pct,
        "community_first": community_first,
        "community_first_pct": community_pct,
        "support_median_min": median(response_times_support),
        "community_median_min": median(response_times_community),
        "sla": {
            "support_weekday_median_min": median(support_weekday),
            "support_weekend_median_min": median(support_weekend),
            "support_commercial_median_min": median(support_commercial),
            "group_weekday_median_min": median(community_weekday),
            "group_weekend_median_min": median(community_weekend),
            "group_commercial_median_min": median(community_commercial),
        },
        "sample_sizes": {
            "support_weekday": len(support_weekday),
            "support_weekend": len(support_weekend),
            "community_weekday": len(community_weekday),
            "community_weekend": len(community_weekend),
        },
    }


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    results = {}
    for name, gid in GROUPS.items():
        results[name] = analyze_group(sb, name, gid)

    # Combined metrics (both groups)
    total_support = sum(r["support_first"] for r in results.values())
    total_community = sum(r["community_first"] for r in results.values())
    total_answered = total_support + total_community

    print(f"\n{'='*60}")
    print(f"COMBINED RESULTS (both groups)")
    print(f"{'='*60}")
    print(f"Total questions answered: {total_answered}")
    print(f"Support first: {total_support} ({round(total_support/total_answered*100) if total_answered else 0}%)")
    print(f"Community first: {total_community} ({round(total_community/total_answered*100) if total_answered else 0}%)")

    # Output JSON for API update
    output = {
        "per_group": results,
        "combined": {
            "total_responses": total_answered,
            "support_first_pct": round(total_support / total_answered * 100) if total_answered else 0,
            "group_first_pct": round(total_community / total_answered * 100) if total_answered else 0,
        },
    }

    with open("response_analysis_results.json", "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to response_analysis_results.json")


if __name__ == "__main__":
    main()
