"""
CLI tool for managing monitored Telegram groups.

Usage:
    python manage_groups.py list
    python manage_groups.py add <telegram_group_id_or_link>
    python manage_groups.py remove <group_db_id>
    python manage_groups.py status
    python manage_groups.py collect-now
    python manage_groups.py analyze-now
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("manage_groups")


def _get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def _get_client():
    """Lazy import to avoid loading Telethon when not needed."""
    from collector import _make_client
    return _make_client()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_list() -> None:
    """List all monitored groups."""
    supabase = _get_supabase()
    result = supabase.table("tg_groups").select("*").order("created_at", desc=True).execute()
    groups: list[dict[str, Any]] = result.data or []

    if not groups:
        print("No groups registered yet.")
        return

    print(f"\n{'ID':<38} {'Name':<30} {'Telegram ID':<25} {'Active':<8} {'Last collected'}")
    print("-" * 120)
    for g in groups:
        last = g.get("last_collected_at", "never")
        if last and last != "never":
            last = last[:16]
        active = "yes" if g.get("is_active") else "no"
        print(f"{g['id']:<38} {(g.get('name') or ''):<30} {g['telegram_id']:<25} {active:<8} {last}")
    print()


async def cmd_add(telegram_id: str) -> None:
    """Add a group to monitored list, resolving its title via Telethon."""
    supabase = _get_supabase()

    # Normalise: strip leading @ and https://t.me/
    if telegram_id.startswith("https://t.me/"):
        telegram_id = telegram_id.replace("https://t.me/", "")
    if telegram_id.startswith("t.me/"):
        telegram_id = telegram_id.replace("t.me/", "")
    if not telegram_id.startswith("@") and not telegram_id.lstrip("-").isdigit():
        telegram_id = "@" + telegram_id

    # Check if already registered
    existing = (
        supabase.table("tg_groups")
        .select("id, is_active")
        .eq("telegram_id", telegram_id)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        if row["is_active"]:
            print(f"Group {telegram_id} is already active (id={row['id']})")
        else:
            supabase.table("tg_groups").update({"is_active": True}).eq("id", row["id"]).execute()
            print(f"Group {telegram_id} re-activated (id={row['id']})")
        return

    # Resolve group title
    name: str | None = None
    client = _get_client()
    phone = os.environ.get("TELEGRAM_PHONE", "")
    async with client:
        await client.start(phone=phone)
        try:
            entity = await client.get_entity(telegram_id)
            name = getattr(entity, "title", None) or getattr(entity, "username", None)
        except Exception as exc:
            logger.warning("Could not resolve entity %s: %s — storing without name", telegram_id, exc)

    row = {
        "telegram_id": telegram_id,
        "name": name,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("tg_groups").insert(row).execute()
    new_id = result.data[0]["id"]
    print(f"Added group '{name or telegram_id}' with id={new_id}")


def cmd_remove(group_db_id: str) -> None:
    """Deactivate a group (soft delete — keeps historical data)."""
    supabase = _get_supabase()
    result = supabase.table("tg_groups").select("id, name, telegram_id").eq("id", group_db_id).execute()
    if not result.data:
        print(f"Group {group_db_id} not found.")
        sys.exit(1)
    group = result.data[0]
    supabase.table("tg_groups").update({"is_active": False}).eq("id", group_db_id).execute()
    print(f"Deactivated group '{group.get('name') or group['telegram_id']}' (id={group_db_id})")


def cmd_status() -> None:
    """Show collection and analysis status for all groups."""
    supabase = _get_supabase()
    groups_result = supabase.table("tg_groups").select("*").execute()
    groups: list[dict[str, Any]] = groups_result.data or []

    if not groups:
        print("No groups registered.")
        return

    print(f"\n{'Name':<30} {'Active':<8} {'Messages':<10} {'Last collected':<22} {'Last analysis'}")
    print("-" * 100)

    for g in groups:
        gid = g["id"]
        active = "yes" if g.get("is_active") else "no"

        msg_count_result = (
            supabase.table("tg_messages")
            .select("id", count="exact")
            .eq("tg_group_id", gid)
            .execute()
        )
        msg_count = msg_count_result.count or 0

        last_collected = g.get("last_collected_at", "never")
        if last_collected and last_collected != "never":
            last_collected = last_collected[:16]

        summary_result = (
            supabase.table("tg_summaries")
            .select("period_end")
            .eq("tg_group_id", gid)
            .order("period_end", desc=True)
            .limit(1)
            .execute()
        )
        last_analysis = "never"
        if summary_result.data:
            last_analysis = summary_result.data[0]["period_end"][:16]

        name = g.get("name") or g["telegram_id"]
        print(f"{name:<30} {active:<8} {msg_count:<10} {last_collected:<22} {last_analysis}")

    print()


async def cmd_collect_now() -> None:
    """Trigger an immediate collection run."""
    from collector import run_collection, _make_client
    phone = os.environ.get("TELEGRAM_PHONE", "")
    client = _make_client()
    async with client:
        await client.start(phone=phone)
        await run_collection(client)
    print("Collection complete.")


def cmd_analyze_now() -> None:
    """Trigger an immediate analysis run."""
    from analyzer import run_analysis
    run_analysis()
    print("Analysis complete.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "list":
        cmd_list()
    elif command == "add":
        if len(sys.argv) < 3:
            print("Usage: python manage_groups.py add <telegram_group_id_or_link>")
            sys.exit(1)
        asyncio.run(cmd_add(sys.argv[2]))
    elif command == "remove":
        if len(sys.argv) < 3:
            print("Usage: python manage_groups.py remove <group_db_id>")
            sys.exit(1)
        cmd_remove(sys.argv[2])
    elif command == "status":
        cmd_status()
    elif command == "collect-now":
        asyncio.run(cmd_collect_now())
    elif command == "analyze-now":
        cmd_analyze_now()
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
