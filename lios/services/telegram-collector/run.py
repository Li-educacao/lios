"""
Entry point for the Telegram collector service.

Starts the Telethon client, schedules periodic collection and analysis,
and handles graceful shutdown on SIGINT/SIGTERM.
"""

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("run")

COLLECTION_INTERVAL_MINUTES: int = int(os.getenv("COLLECTION_INTERVAL_MINUTES", "60"))
ANALYSIS_INTERVAL_HOURS: int = int(os.getenv("ANALYSIS_INTERVAL_HOURS", "24"))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_env() -> None:
    required = [
        "TELEGRAM_API_ID",
        "TELEGRAM_API_HASH",
        "TELEGRAM_PHONE",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "GEMINI_API_KEY",
    ]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        logger.error("Missing required environment variables: %s", ", ".join(missing))
        sys.exit(1)


# ---------------------------------------------------------------------------
# Scheduler loop
# ---------------------------------------------------------------------------

async def _collection_loop(client) -> None:
    """Run collection on a fixed interval."""
    from collector import run_collection
    interval_secs = COLLECTION_INTERVAL_MINUTES * 60
    logger.info("Collection scheduled every %d minutes", COLLECTION_INTERVAL_MINUTES)
    while True:
        start = datetime.now()
        logger.info("Collection cycle starting at %s", start.strftime("%H:%M:%S"))
        try:
            await run_collection(client)
        except Exception:
            logger.exception("Unhandled error in collection cycle")
        elapsed = (datetime.now() - start).total_seconds()
        sleep_for = max(0, interval_secs - elapsed)
        logger.info("Next collection in %.0f seconds", sleep_for)
        await asyncio.sleep(sleep_for)


async def _analysis_loop() -> None:
    """Run analysis on a fixed interval."""
    from analyzer import run_analysis
    interval_secs = ANALYSIS_INTERVAL_HOURS * 3600
    logger.info("Analysis scheduled every %d hours", ANALYSIS_INTERVAL_HOURS)
    # Delay first analysis run to let the first collection finish
    initial_delay = min(300, interval_secs)  # 5 minutes or full interval, whichever is smaller
    logger.info("First analysis run in %d seconds", initial_delay)
    await asyncio.sleep(initial_delay)
    while True:
        start = datetime.now()
        logger.info("Analysis cycle starting at %s", start.strftime("%H:%M:%S"))
        try:
            run_analysis()
        except Exception:
            logger.exception("Unhandled error in analysis cycle")
        elapsed = (datetime.now() - start).total_seconds()
        sleep_for = max(0, interval_secs - elapsed)
        logger.info("Next analysis in %.0f seconds", sleep_for)
        await asyncio.sleep(sleep_for)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    _validate_env()

    from collector import _make_client

    stop_event = asyncio.Event()

    def _handle_signal(sig, _frame) -> None:
        logger.info("Received signal %s — shutting down gracefully", sig)
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    phone = os.environ["TELEGRAM_PHONE"]
    client = _make_client()

    logger.info("Starting Telethon client and authenticating...")
    await client.start(phone=phone)
    logger.info("Telegram client ready. Logged in as: %s", await client.get_me())

    logger.info(
        "Collector running — collection every %dm, analysis every %dh",
        COLLECTION_INTERVAL_MINUTES,
        ANALYSIS_INTERVAL_HOURS,
    )

    collection_task = asyncio.create_task(_collection_loop(client))
    analysis_task = asyncio.create_task(_analysis_loop())

    # Run until stop signal
    await stop_event.wait()

    logger.info("Cancelling background tasks...")
    collection_task.cancel()
    analysis_task.cancel()
    try:
        await asyncio.gather(collection_task, analysis_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass

    await client.disconnect()
    logger.info("Shutdown complete.")


if __name__ == "__main__":
    asyncio.run(main())
