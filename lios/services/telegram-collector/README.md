# Telegram Collector

Standalone Python service that collects messages from Telegram groups and runs AI analysis using Gemini 2.5 Pro. Part of the LIOS intelligence layer.

## Architecture

```
run.py              ← entry point, scheduler, graceful shutdown
collector.py        ← Telethon client, message fetching, Supabase storage
analyzer.py         ← Gemini analysis, insights extraction, tg_summaries
manage_groups.py    ← CLI for group management
```

Data flow: `Telegram → collector.py → tg_messages → analyzer.py → tg_summaries / tg_insights`

## Setup

### 1. Get Telegram API credentials

Go to https://my.telegram.org → API development tools → create application. Copy `api_id` and `api_hash`.

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_API_ID` | From my.telegram.org |
| `TELEGRAM_API_HASH` | From my.telegram.org |
| `TELEGRAM_PHONE` | Your phone number in international format (+5511...) |
| `SUPABASE_URL` | `https://tqpkymereiyfxroiuaip.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key — needs write access) |
| `GEMINI_API_KEY` | Google AI Studio key |

Optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `COLLECTION_INTERVAL_MINUTES` | 60 | How often to collect new messages |
| `ANALYSIS_INTERVAL_HOURS` | 24 | How often to run AI analysis |
| `HISTORY_DAYS` | 30 | Days of history to fetch on first run |

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Using a virtual environment is recommended:

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

### 4. Add a group to monitor

```bash
# By public username
python manage_groups.py add @groupusername

# By t.me link
python manage_groups.py add https://t.me/groupusername

# By numeric ID (for private groups — you must already be a member)
python manage_groups.py add -1001234567890
```

On first run the CLI will open a Telegram auth prompt. Enter the code sent to your phone.

### 5. Start the service

```bash
python run.py
```

The service will:
1. Authenticate with Telegram (interactive on first run, session file used after)
2. Immediately run a collection for all active groups
3. Schedule subsequent collections every `COLLECTION_INTERVAL_MINUTES`
4. Schedule analysis every `ANALYSIS_INTERVAL_HOURS`

## CLI Reference

```bash
python manage_groups.py list          # list all registered groups
python manage_groups.py add <id>      # add a group
python manage_groups.py remove <uuid> # deactivate a group (keeps data)
python manage_groups.py status        # message counts and last run times
python manage_groups.py collect-now   # run collection immediately
python manage_groups.py analyze-now   # run analysis immediately
```

## Supabase Schema

The service writes to these tables (schema must be applied separately):

| Table | Purpose |
|-------|---------|
| `tg_groups` | Registered groups + collection state |
| `tg_messages` | Raw messages (text, polls, voice transcriptions, reactions) |
| `tg_summaries` | AI-generated summaries per period |
| `tg_insights` | Individual insights, filterable by category and tags |
| `tg_notable_members` | Active members with roles and contribution notes |

## Notes

- The Telethon session file (`lios_collector.session`) is created next to `run.py`. Back it up — losing it requires re-authentication.
- Voice transcriptions require Telegram Premium on the account running the collector.
- The service uses the Telegram Client API (MTProto), not the Bot API. The phone number must be a real user account that is a member of the monitored groups.
- FloodWait errors are handled automatically with exponential backoff.
