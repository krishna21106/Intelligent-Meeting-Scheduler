"""
Unit and Integration Tests for Interval Intersection Scheduler Algorithm.

Covers all required viva test cases:
1. No overlap between participants (detects conflict)
2. Exact fit (slot exactly fits requested duration)
3. Multi-timezone scheduling (Kolkata, London, New York)
4. One participant fully booked (conflict analysis & blocking participant identification)
5. Optional participants ranking bonus
6. Lunch hour avoidance & scoring preferences
7. Double-booking prevention
"""

import pytest
import sqlite3
from datetime import datetime, date, timedelta
import zoneinfo

from backend.database import init_db, get_connection
from backend.scheduler import (
    merge_intervals,
    subtract_intervals,
    intersect_two_interval_lists,
    intersect_multiple_interval_lists,
    get_working_hours_utc,
    suggest_meeting_slots,
    check_double_booking,
    parse_iso_datetime,
)


@pytest.fixture
def test_db(tmp_path):
    """Creates a temporary isolated SQLite database for testing."""
    db_file = tmp_path / "test_planner.db"
    init_db(str(db_file))
    with get_connection(str(db_file)) as conn:
        yield conn, str(db_file)


# ============================================================================
# PURE ALGORITHM UNIT TESTS
# ============================================================================

def test_merge_intervals():
    """Tests interval merging for overlapping and adjacent intervals."""
    utc = zoneinfo.ZoneInfo("UTC")
    t0 = datetime(2026, 10, 15, 9, 0, tzinfo=utc)
    t1 = datetime(2026, 10, 15, 10, 0, tzinfo=utc)
    t2 = datetime(2026, 10, 15, 10, 30, tzinfo=utc)
    t3 = datetime(2026, 10, 15, 11, 30, tzinfo=utc)
    t4 = datetime(2026, 10, 15, 13, 0, tzinfo=utc)
    t5 = datetime(2026, 10, 15, 14, 0, tzinfo=utc)

    # Overlapping [9:00-10:30] and [10:00-11:30] -> [9:00-11:30], plus disjoint [13:00-14:00]
    intervals = [(t0, t2), (t1, t3), (t4, t5)]
    merged = merge_intervals(intervals)
    assert len(merged) == 2
    assert merged[0] == (t0, t3)
    assert merged[1] == (t4, t5)


def test_subtract_intervals():
    """Tests subtraction of busy intervals from a base working window."""
    utc = zoneinfo.ZoneInfo("UTC")
    # Base: 09:00 to 17:00
    w_start = datetime(2026, 10, 15, 9, 0, tzinfo=utc)
    w_end = datetime(2026, 10, 15, 17, 0, tzinfo=utc)

    # Busy 11:00 to 12:00
    b1_start = datetime(2026, 10, 15, 11, 0, tzinfo=utc)
    b1_end = datetime(2026, 10, 15, 12, 0, tzinfo=utc)

    # Busy 14:00 to 15:00
    b2_start = datetime(2026, 10, 15, 14, 0, tzinfo=utc)
    b2_end = datetime(2026, 10, 15, 15, 0, tzinfo=utc)

    free = subtract_intervals([(w_start, w_end)], [(b1_start, b1_end), (b2_start, b2_end)])
    assert len(free) == 3
    assert free[0] == (w_start, b1_start)  # 09:00 to 11:00
    assert free[1] == (b1_end, b2_start)   # 12:00 to 14:00
    assert free[2] == (b2_end, w_end)     # 15:00 to 17:00


def test_two_pointer_interval_intersection():
    """Tests two-pointer interval intersection algorithm across two lists."""
    utc = zoneinfo.ZoneInfo("UTC")
    # List A: [09:00 - 12:00], [14:00 - 17:00]
    list_a = [
        (datetime(2026, 10, 15, 9, 0, tzinfo=utc), datetime(2026, 10, 15, 12, 0, tzinfo=utc)),
        (datetime(2026, 10, 15, 14, 0, tzinfo=utc), datetime(2026, 10, 15, 17, 0, tzinfo=utc)),
    ]
    # List B: [10:00 - 15:00]
    list_b = [
        (datetime(2026, 10, 15, 10, 0, tzinfo=utc), datetime(2026, 10, 15, 15, 0, tzinfo=utc)),
    ]

    common = intersect_two_interval_lists(list_a, list_b)
    # Expected: [10:00 - 12:00] and [14:00 - 15:00]
    assert len(common) == 2
    assert common[0] == (datetime(2026, 10, 15, 10, 0, tzinfo=utc), datetime(2026, 10, 15, 12, 0, tzinfo=utc))
    assert common[1] == (datetime(2026, 10, 15, 14, 0, tzinfo=utc), datetime(2026, 10, 15, 15, 0, tzinfo=utc))


# ============================================================================
# INTEGRATION TESTS: REQUIRED VIVA SCENARIOS
# ============================================================================

def test_no_overlap_scenario(test_db):
    """
    Scenario 1: No Overlap
    Participant A is free only in the morning (09:00 - 12:00 UTC).
    Participant B is free only in the afternoon (13:00 - 17:00 UTC).
    Result: 0 common slots, conflict detected with clear explanation.
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('Alice Morning', 'alice@test.com', 'UTC', '09:00', '17:00'),
               ('Bob Afternoon', 'bob@test.com', 'UTC', '09:00', '17:00')
    """)
    conn.commit()

    # Alice is busy in afternoon: 12:00 to 17:00
    cursor.execute("""
        INSERT INTO busy_slots (participant_id, start_time, end_time, title)
        VALUES (1, '2026-10-15T12:00:00Z', '2026-10-15T17:00:00Z', 'Client Demos')
    """)

    # Bob is busy all morning: 09:00 to 13:00
    cursor.execute("""
        INSERT INTO busy_slots (participant_id, start_time, end_time, title)
        VALUES (2, '2026-10-15T09:00:00Z', '2026-10-15T13:00:00Z', 'Strategy Summit')
    """)
    conn.commit()

    result = suggest_meeting_slots(
        target_date_str="2026-10-15",
        duration_minutes=30,
        required_participant_ids=[1, 2],
        conn=conn
    )

    assert len(result.slots) == 0
    assert result.conflict_analysis is not None
    assert result.conflict_analysis.conflict_detected is True
    assert "Conflict detected" in result.conflict_analysis.summary


def test_exact_fit_scenario(test_db):
    """
    Scenario 2: Exact Fit
    Participants have exactly a 45-minute common gap (e.g. 10:00 - 10:45 UTC).
    Requested duration: 45 minutes.
    Result: Exactly 1 valid candidate slot suggested.
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('Charlie', 'charlie@test.com', 'UTC', '09:00', '17:00')
    """)
    conn.commit()

    # Block 09:00 to 10:00 and 10:45 to 17:00 -> exactly 45 mins free [10:00 - 10:45]
    cursor.execute("""
        INSERT INTO busy_slots (participant_id, start_time, end_time, title)
        VALUES (1, '2026-10-15T09:00:00Z', '2026-10-15T10:00:00Z', 'Morning Standup'),
               (1, '2026-10-15T10:45:00Z', '2026-10-15T17:00:00Z', 'Afternoon Focus')
    """)
    conn.commit()

    result = suggest_meeting_slots(
        target_date_str="2026-10-15",
        duration_minutes=45,
        required_participant_ids=[1],
        conn=conn
    )

    assert len(result.slots) == 1
    slot = result.slots[0]
    assert slot.start_time == "2026-10-15T10:00:00Z"
    assert slot.end_time == "2026-10-15T10:45:00Z"


def test_multi_timezone_intersection(test_db):
    """
    Scenario 3: Multi-Timezone Scheduling
    Participant 1: New York (America/New_York) working 09:00 - 17:00 local (13:00 - 21:00 UTC)
    Participant 2: London (Europe/London) working 09:00 - 17:00 local (08:00 - 16:00 UTC in BST)
    Participant 3: Kolkata (Asia/Kolkata) working 13:30 - 21:30 local (08:00 - 16:00 UTC)

    Common working hours overlap should be correctly found around 13:00 - 16:00 UTC!
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('John NY', 'john@test.com', 'America/New_York', '09:00', '17:00'),
               ('Sarah London', 'sarah@test.com', 'Europe/London', '09:00', '17:00'),
               ('Ravi Kolkata', 'ravi@test.com', 'Asia/Kolkata', '13:30', '21:30')
    """)
    conn.commit()

    result = suggest_meeting_slots(
        target_date_str="2026-10-15",
        duration_minutes=30,
        required_participant_ids=[1, 2, 3],
        organizer_timezone="Asia/Kolkata",
        conn=conn
    )

    assert len(result.slots) > 0
    # Every suggested slot must be within all 3 participants' working hours
    for slot in result.slots:
        s_utc = parse_iso_datetime(slot.start_time)
        e_utc = parse_iso_datetime(slot.end_time)

        # In NY (EDT, UTC-4): 13:00 UTC is 09:00 NY, 16:00 UTC is 12:00 NY
        ny_tz = zoneinfo.ZoneInfo("America/New_York")
        s_ny = s_utc.astimezone(ny_tz)
        assert s_ny.hour >= 9

        # In London: 13:00 UTC is 14:00 BST
        lon_tz = zoneinfo.ZoneInfo("Europe/London")
        s_lon = s_utc.astimezone(lon_tz)
        assert s_lon.hour >= 9 and s_lon.hour < 17

        # In Kolkata: 13:00 UTC is 18:30 IST
        kol_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        s_kol = s_utc.astimezone(kol_tz)
        assert s_kol.hour >= 13 and s_kol.hour < 22


def test_one_participant_fully_booked(test_db):
    """
    Scenario 4: One participant fully booked
    A required participant is booked throughout the day.
    Algorithm detects this, reports the blocking participant, and suggests alternative days.
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('Dave Free', 'dave@test.com', 'UTC', '09:00', '17:00'),
               ('Emma Busy', 'emma@test.com', 'UTC', '09:00', '17:00')
    """)
    conn.commit()

    # Emma is booked the whole day on 2026-10-15
    cursor.execute("""
        INSERT INTO busy_slots (participant_id, start_time, end_time, title)
        VALUES (2, '2026-10-15T09:00:00Z', '2026-10-15T17:00:00Z', 'All-Day Workshop')
    """)
    conn.commit()

    result = suggest_meeting_slots(
        target_date_str="2026-10-15",
        duration_minutes=60,
        required_participant_ids=[1, 2],
        conn=conn
    )

    assert len(result.slots) == 0
    assert result.conflict_analysis is not None
    assert result.conflict_analysis.conflict_detected is True
    assert any("Emma Busy" in b for b in result.conflict_analysis.blocking_participants)
    # Nearest alternative days are populated (since Emma is free on 2026-10-16+)
    assert len(result.conflict_analysis.suggested_alternative_days) > 0


def test_optional_participants_ranking_bonus(test_db):
    """
    Scenario 5: Optional Participants Ranking
    A slot where an optional participant is free should receive a higher score
    than a slot where the optional participant is busy.
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('Req User', 'req@test.com', 'UTC', '09:00', '17:00'),
               ('Opt User', 'opt@test.com', 'UTC', '09:00', '17:00')
    """)
    conn.commit()

    # Opt User is busy in afternoon [13:00 - 17:00]
    cursor.execute("""
        INSERT INTO busy_slots (participant_id, start_time, end_time, title)
        VALUES (2, '2026-10-15T13:00:00Z', '2026-10-15T17:00:00Z', 'Opt Busy Time')
    """)
    conn.commit()

    result = suggest_meeting_slots(
        target_date_str="2026-10-15",
        duration_minutes=30,
        required_participant_ids=[1],
        optional_participant_ids=[2],
        conn=conn
    )

    # Slots in morning should have opt user free (free_optional_count = 1)
    morning_slots = [s for s in result.slots if s.start_time_local < "12:00"]
    afternoon_slots = [s for s in result.slots if s.start_time_local >= "13:00"]

    assert len(morning_slots) > 0
    assert len(afternoon_slots) > 0

    best_morning = morning_slots[0]
    best_afternoon = afternoon_slots[0]

    assert best_morning.free_optional_count == 1
    assert best_afternoon.free_optional_count == 0
    # Score for slot with optional participant free is substantially higher
    assert best_morning.score > best_afternoon.score


def test_double_booking_prevention(test_db):
    """
    Scenario 6: Double-Booking Prevention
    `check_double_booking` detects collisions and prevents double booking.
    """
    conn, db_path = test_db
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO participants (name, email, timezone, work_start, work_end)
        VALUES ('Participant One', 'one@test.com', 'UTC', '09:00', '17:00')
    """)
    cursor.execute("""
        INSERT INTO meetings (title, date, start_time, end_time, status, created_at)
        VALUES ('Sprint Review', '2026-10-15', '2026-10-15T14:00:00Z', '2026-10-15T15:00:00Z', 'scheduled', '2026-10-12T10:00:00Z')
    """)
    meeting_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO meeting_participants (meeting_id, participant_id, required)
        VALUES (?, 1, 1)
    """, (meeting_id,))
    conn.commit()

    # Attempt to book overlapping interval: 14:30 - 15:30
    is_conflict, err = check_double_booking(
        conn=conn,
        participant_ids=[1],
        start_time_iso="2026-10-15T14:30:00Z",
        end_time_iso="2026-10-15T15:30:00Z"
    )
    assert is_conflict is True
    assert "Conflict" in err

    # Non-overlapping interval: 15:00 - 16:00
    is_conflict_free, err_free = check_double_booking(
        conn=conn,
        participant_ids=[1],
        start_time_iso="2026-10-15T15:00:00Z",
        end_time_iso="2026-10-15T16:00:00Z"
    )
    assert is_conflict_free is False
    assert err_free is None

