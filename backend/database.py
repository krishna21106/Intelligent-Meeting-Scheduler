"""
Database module for the AI-Powered Intelligent Meeting Planner.
Uses Python's built-in sqlite3 module with foreign keys, WAL mode, busy timeout,
and optimized indexes for lightning-fast queries.
"""

import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, List, Dict, Any

DEFAULT_DB_FILE = Path(__file__).resolve().parent.parent / "meeting_planner.db"
DATABASE_PATH = Path(os.environ.get("MEETING_PLANNER_DB", str(DEFAULT_DB_FILE)))


@contextmanager
def get_connection(db_path: Path | str | None = None) -> Iterator[sqlite3.Connection]:
    """
    Open, commit or roll back, and close a sqlite3 connection safely.
    Configured with WAL mode, 5000ms busy timeout, row_factory, and foreign keys.
    """
    target = Path(db_path) if db_path is not None else DATABASE_PATH
    connection = sqlite3.connect(target, timeout=5.0)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.execute("PRAGMA journal_mode = WAL;")
    connection.execute("PRAGMA busy_timeout = 5000;")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database(db_path: Path | str | None = None) -> None:
    """
    Create the five required database tables and performance indexes:
    1. participants
    2. busy_slots
    3. meetings
    4. meeting_participants
    5. notifications
    """
    with get_connection(db_path) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                timezone TEXT NOT NULL DEFAULT 'UTC',
                work_start TEXT NOT NULL DEFAULT '09:00',
                work_end TEXT NOT NULL DEFAULT '17:00',
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS busy_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'Busy'
            );

            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS meeting_participants (
                meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
                required INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (meeting_id, participant_id)
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
                participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                notify_at TEXT NOT NULL,
                sent INTEGER NOT NULL DEFAULT 0
            );

            -- Indexes for fast interval search and collision detection
            CREATE INDEX IF NOT EXISTS idx_users_email
                ON users(email);

            CREATE INDEX IF NOT EXISTS idx_busy_slots_lookup 
                ON busy_slots(participant_id, start_time, end_time);

            CREATE INDEX IF NOT EXISTS idx_meetings_status_time 
                ON meetings(status, start_time, end_time);

            CREATE INDEX IF NOT EXISTS idx_meeting_parts_meeting 
                ON meeting_participants(meeting_id);

            CREATE INDEX IF NOT EXISTS idx_meeting_parts_participant 
                ON meeting_participants(participant_id);

            CREATE INDEX IF NOT EXISTS idx_notifications_due 
                ON notifications(sent, notify_at);
            """
        )

        # Migrate user_id column if table existed previously without it
        part_cols = [row["name"] for row in connection.execute("PRAGMA table_info(participants);").fetchall()]
        if "user_id" not in part_cols:
            connection.execute("ALTER TABLE participants ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")

        meet_cols = [row["name"] for row in connection.execute("PRAGMA table_info(meetings);").fetchall()]
        if "user_id" not in meet_cols:
            connection.execute("ALTER TABLE meetings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;")



# Alias for compatibility with test suites and external modules
init_db = initialize_database


def rows_as_dicts(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    """Convert SQLite Row objects into JSON-friendly Python dictionaries."""
    return [dict(row) for row in rows]

