"""
Natural Language Parser for Meeting Requests.
Provides deterministic regex and rule-based extraction (no paid API required),
plus an optional LLM hook if OPENAI_API_KEY or GEMINI_API_KEY is configured in .env.
"""

import os
import re
import json
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load .env file if present
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _try_llm_parse(text: str, participants: list[dict], timezone_name: str) -> dict | None:
    """
    Optional LLM Hook: If OPENAI_API_KEY is set in environment, calls OpenAI-compatible API
    to parse structured meeting details. Returns None on failure or if not configured.
    """
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    names_list = [p["name"] for p in participants]
    prompt = (
        f"You are a meeting assistant. Parse this meeting request: '{text}'.\n"
        f"Known participants: {names_list}.\n"
        f"Reference timezone: {timezone_name}.\n"
        f"Respond ONLY with valid JSON having keys: title, date (YYYY-MM-DD), "
        f"duration_minutes (integer), participant_names (list of strings), preferred_start (HH:MM or null), preferred_end (HH:MM or null)."
    )

    try:
        # Standard OpenAI-compatible completion request
        endpoint = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }
        with httpx.Client(timeout=4.0) as client:
            response = client.post(endpoint, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)

                # Match names to participant IDs
                matched_ids = []
                for name in parsed.get("participant_names", []):
                    for p in participants:
                        if name.lower() in p["name"].lower() or p["name"].lower() in name.lower():
                            if p["id"] not in matched_ids:
                                matched_ids.append(p["id"])

                return {
                    "title": parsed.get("title", "Team meeting"),
                    "date": parsed.get("date"),
                    "duration_minutes": int(parsed.get("duration_minutes", 30)),
                    "participant_ids": matched_ids,
                    "participant_names": [p["name"] for p in participants if p["id"] in matched_ids],
                    "timezone": timezone_name,
                    "preferred_start": parsed.get("preferred_start"),
                    "preferred_end": parsed.get("preferred_end"),
                }
    except Exception:
        # Gracefully fall back to rule-based parser on any error or timeout
        pass

    return None


def parse_meeting_request(
    text: str, participants: list[dict], timezone_name: str = "UTC"
) -> dict:
    """
    Extract date, duration, known participants, title, and preferred time window.
    First tries optional LLM if key is configured, otherwise uses deterministic regex rules.
    """
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Request text cannot be empty.")

    # 1. Check optional LLM hook first if API key is configured
    llm_result = _try_llm_parse(cleaned, participants, timezone_name)
    if llm_result and llm_result.get("date") and llm_result.get("duration_minutes"):
        return llm_result

    # 2. Deterministic Rule-Based Parsing (Zero cost, works offline)
    zone = ZoneInfo(timezone_name)
    today = datetime.now(zone).date()
    lower = cleaned.lower()
    meeting_day = _extract_date(lower, today)

    # Duration extraction: e.g. "45 minutes", "1 hour", "30 mins", "90m"
    hour_match = re.search(r"\b(\d{1,2}(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b", lower)
    if hour_match:
        duration = int(float(hour_match.group(1)) * 60)
    else:
        duration_match = re.search(r"\b(\d{1,3})\s*(?:minutes?|mins?|m)\b", lower)
        duration = int(duration_match.group(1)) if duration_match else 30

    if duration < 1 or duration > 720:
        raise ValueError("Meeting duration must be between 1 and 720 minutes.")

    # Participant matching against database directory
    found_people = [
        participant
        for participant in participants
        if re.search(rf"(?<!\w){re.escape(participant['name'])}(?!\w)", cleaned, re.I)
        or re.search(
            rf"(?<!\w){re.escape(participant['name'].split()[0])}(?!\w)", cleaned, re.I
        )
    ]
    participant_ids = list(dict.fromkeys(int(person["id"]) for person in found_people))

    # Time window preference
    window = None
    if re.search(r"\b(morning|am)\b", lower):
        window = ("09:00", "12:00")
    elif re.search(r"\b(afternoon|pm)\b", lower):
        window = ("13:00", "17:00")
    elif re.search(r"\bevening\b", lower):
        window = ("17:00", "20:00")

    # Title extraction
    title_match = re.search(
        r"(?:meeting|call|sync|discussion)\s+(?:about|for|on)\s+(.+?)(?=\s+(?:with|tomorrow|today|"
        r"on\s+\w+|\d+\s*(?:minutes?|mins?))|$)",
        cleaned,
        re.I,
    )
    title = title_match.group(1).strip(" .,!") if title_match else "Team meeting"

    return {
        "title": title or "Team meeting",
        "date": meeting_day.isoformat(),
        "duration_minutes": duration,
        "participant_ids": participant_ids,
        "participant_names": [person["name"] for person in found_people],
        "timezone": timezone_name,
        "preferred_start": window[0] if window else None,
        "preferred_end": window[1] if window else None,
    }


def _extract_date(text: str, today: date) -> date:
    """Recognize relative days, weekdays, and common numeric dates."""
    if re.search(r"\btomorrow\b", text):
        return today + timedelta(days=1)
    if re.search(r"\btoday\b", text):
        return today

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }
    for name, weekday in weekdays.items():
        if re.search(rf"\b{name}(?:s)?\b", text):
            days_ahead = (weekday - today.weekday()) % 7
            return today + timedelta(days=days_ahead or 7)

    iso_date = re.search(r"\b(20\d{2}-\d{1,2}-\d{1,2})\b", text)
    if iso_date:
        return date.fromisoformat(iso_date.group(1))

    month_date = re.search(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
        r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|"
        r"dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b",
        text,
    )
    if month_date:
        month_name, day_number, year = month_date.groups()
        parsed = datetime.strptime(f"{month_name} {day_number}", "%B %d") if len(month_name) > 3 else None
        if parsed is None:
            parsed = datetime.strptime(month_name[:3].title() + f" {day_number}", "%b %d")
        candidate = date(int(year) if year else today.year, parsed.month, parsed.day)
        if not year and candidate < today:
            candidate = candidate.replace(year=today.year + 1)
        return candidate


    return today + timedelta(days=1)
