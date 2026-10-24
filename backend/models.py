"""
Pydantic Data Models and Schemas for AI-Powered Meeting Planner.
Enforces type validation and provides clear contracts for API endpoints.
"""

import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ParticipantBase(BaseModel):
    name: str = Field(..., description="Full name of participant")
    email: str = Field(..., description="Unique email address")
    timezone: str = Field("UTC", description="IANA Timezone, e.g. 'Asia/Kolkata', 'Europe/London', 'America/New_York'")
    work_start: str = Field("09:00", description="Working hours start time (HH:MM in 24hr format)")
    work_end: str = Field("17:00", description="Working hours end time (HH:MM in 24hr format)")


class ParticipantCreate(ParticipantBase):
    pass


class ParticipantResponse(ParticipantBase):
    id: int


class BusySlotCreate(BaseModel):
    participant_id: int
    start_time: str = Field(..., description="ISO 8601 formatted start datetime, e.g. 2026-10-15T10:00:00Z")
    end_time: str = Field(..., description="ISO 8601 formatted end datetime, e.g. 2026-10-15T11:00:00Z")
    title: Optional[str] = Field("Busy", description="Title or description of the busy block")


class BusySlotResponse(BusySlotCreate):
    id: int


class MeetingSuggestRequest(BaseModel):
    title: str = Field(..., description="Meeting title / agenda")
    date: datetime.date = Field(..., description="Target date in YYYY-MM-DD format")
    duration_minutes: int = Field(..., gt=0, le=720, description="Duration in minutes (e.g. 15, 30, 45, 60)")
    participant_ids: List[int] = Field(..., min_length=1, description="List of required participant IDs")
    optional_participant_ids: List[int] = Field(default=[], description="List of optional participant IDs")
    timezone: str = Field("UTC", description="Organizer's local timezone")
    preferred_start: Optional[str] = Field(None, description="Preferred window start time (HH:MM)")
    preferred_end: Optional[str] = Field(None, description="Preferred window end time (HH:MM)")


# Backward-compatible alias
SuggestRequest = MeetingSuggestRequest


class MeetingConfirmRequest(BaseModel):
    title: str = Field(..., description="Meeting title")
    start_time: str = Field(..., description="ISO 8601 formatted start datetime")
    end_time: str = Field(..., description="ISO 8601 formatted end datetime")
    participant_ids: List[int] = Field(..., min_length=1, description="Participant IDs (required)")
    optional_participant_ids: List[int] = Field(default=[], description="Optional participant IDs")
    timezone: str = Field("UTC", description="Organizer timezone")


class MeetingRescheduleRequest(BaseModel):
    start_time: str = Field(..., description="New ISO 8601 formatted start datetime")
    end_time: str = Field(..., description="New ISO 8601 formatted end datetime")


class ParseRequest(BaseModel):
    text: str = Field(..., description="Natural language request string")
    timezone: str = Field("UTC", description="Organizer's context timezone")


class SlotSuggestion(BaseModel):
    start_time: str
    end_time: str
    start_time_local: str = ""
    end_time_local: str = ""
    available_optional_participants: int = 0
    free_optional_count: int = 0
    total_optional_count: int = 0
    within_preferred_window: bool = True
    avoids_lunch: bool = True
    score: float = 0.0
    reasons: List[str] = Field(default=[])
    participant_local_times: Dict[str, str] = Field(default={})


class ConflictAnalysis(BaseModel):
    conflict_detected: bool
    summary: str
    blocking_participants: List[str] = []
    nearest_alternative_day: Optional[Dict[str, Any]] = None
    suggested_alternative_days: List[Dict[str, Any]] = []


class SuggestResponse(BaseModel):
    date: str
    duration_minutes: int
    slots: List[SlotSuggestion] = []
    conflict_analysis: Optional[ConflictAnalysis] = None


class NotificationResponse(BaseModel):
    id: int
    meeting_id: int
    participant_id: int
    message: str
    notify_at: str
    sent: int
    participant_name: Optional[str] = None
    meeting_title: Optional[str] = None


class UserSignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User's full name")
    email: str = Field(..., description="Unique user email address")
    password: str = Field(..., min_length=8, description="Password (at least 8 characters)")
    role: Optional[str] = Field("member", description="Role: 'member' or 'admin'")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: str


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Updated role: 'admin' or 'member'")

