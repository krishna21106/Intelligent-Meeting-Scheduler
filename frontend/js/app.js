/**
 * MeetWise AI Planner — Frontend Interactive Controller
 * Optimized vanilla JS client with:
 * - Centralized fetch client (AbortController timeout, JSON error parsing)
 * - In-memory participant cache
 * - Custom accessible toast system
 * - Accessible confirmation modal
 * - Event delegation & DocumentFragment rendering
 * - Page Visibility aware notification polling (35s)
 * - iCalendar (.ics) export & Clipboard copy actions
 * - Day-grouped / ranked suggestions with 7-day alternative conflict resolution
 */

// ==========================================================================
// Toast Notification Engine
// ==========================================================================

function showToast(message, type = "info", duration = 3800) {
  let container = document.querySelector("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");

  const icons = {
    success: `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    error: `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
    warning: `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
    info: `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="16"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`,
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="toast-body">${escapeHtml(message)}</div>
    <button class="toast-close" type="button" aria-label="Dismiss toast">&times;</button>
  `;

  const dismiss = () => {
    toast.classList.add("toast-hiding");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  container.appendChild(toast);

  setTimeout(dismiss, duration);
}

// ==========================================================================
// Accessible Confirmation Modal
// ==========================================================================

function showConfirmModal(title, message, confirmText = "Confirm", isDanger = true) {
  return new Promise((resolve) => {
    const modal = document.querySelector("#confirm-modal");
    if (!modal) {
      resolve(confirm(message));
      return;
    }

    const titleEl = modal.querySelector("#modal-title");
    const msgEl = modal.querySelector("#modal-message");
    const confirmBtn = modal.querySelector("[data-modal-confirm]");
    const cancelBtn = modal.querySelector("[data-modal-cancel]");
    const closeBtn = modal.querySelector("[data-modal-close]");

    titleEl.textContent = title;
    msgEl.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `button ${isDanger ? "danger" : "primary"}`;

    modal.classList.remove("hidden");
    confirmBtn.focus();

    const cleanup = (confirmed) => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      closeBtn.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKeyDown);
      resolve(confirmed);
    };

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKeyDown = (e) => {
      if (e.key === "Escape") cleanup(false);
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    closeBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKeyDown);
  });
}

// ==========================================================================
// Centralized API Client (with Timeout & In-Memory Participant Cache)
// ==========================================================================

async function api(url, options = {}) {
  const { timeout = 12000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(fetchOptions.headers || {}),
      },
      ...fetchOptions,
    });
    clearTimeout(timer);

    if (response.status === 204) return null;
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/signup")) {
        window.location.replace("/login");
        return null;
      }
      const detail = data && data.detail ? data.detail : "The request could not be completed.";
      const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : String(detail);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw err;
  }
}

// In-Memory Participant Cache
let cachedParticipants = null;

async function getParticipants(forceRefresh = false) {
  if (!cachedParticipants || forceRefresh) {
    cachedParticipants = await api("/participants");
  }
  return cachedParticipants;
}

function invalidateParticipantsCache() {
  cachedParticipants = null;
}

// Utilities
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function localDateTime(value, options = {}) {
  try {
    const d = new Date(value);
    if (options.dateOnly) {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
    }
    if (options.timeOnly) {
      return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(d);
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return value;
  }
}

function relativeTime(isoString) {
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins > 0) {
      if (diffMins < 60) return `in ${diffMins}m`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `in ${diffHours}h`;
      return `in ${Math.round(diffHours / 24)}d`;
    } else {
      const absMins = Math.abs(diffMins);
      if (absMins < 1) return "just now";
      if (absMins < 60) return `${absMins}m ago`;
      const absHours = Math.round(absMins / 60);
      if (absHours < 24) return `${absHours}h ago`;
      return `${Math.round(absHours / 24)}d ago`;
    }
  } catch {
    return "";
  }
}

let messageTimeout = null;
function setMessage(text, isError = false) {
  const element = document.querySelector("#page-message");
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("error", isError);

  if (messageTimeout) clearTimeout(messageTimeout);
  if (text) {
    messageTimeout = setTimeout(() => {
      element.textContent = "";
      element.classList.remove("error");
    }, 6000);
  }
}

// ==========================================================================
// Dashboard Controller
// ==========================================================================

async function loadDashboard() {
  try {
    const [meetings, people, reminders] = await Promise.all([
      api("/meetings"),
      getParticipants(),
      api("/notifications"),
    ]);

    const upcoming = meetings.filter((m) => m.status === "scheduled");
    document.querySelector("#meeting-count").textContent = upcoming.length;
    document.querySelector("#participant-count").textContent = people.length;
    document.querySelector("#reminder-count").textContent =
      reminders.notifications.filter((n) => n.sent).length;

    renderMeetings(upcoming);
    renderNotifications(reminders.notifications);
  } catch (error) {
    showToast(`Failed to load dashboard: ${error.message}`, "error");
  }
}

function renderMeetings(meetings) {
  const container = document.querySelector("#meeting-list");
  if (!container) return;

  if (!meetings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
        <div class="empty-title">No upcoming meetings scheduled</div>
        <p class="empty-desc">Your calendar is completely clear. Schedule a meeting in seconds.</p>
        <a class="button primary small" href="/schedule">+ Schedule Meeting</a>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  meetings.forEach((meeting) => {
    const card = document.createElement("article");
    card.className = "meeting-card";

    const avatarsHtml = meeting.participants
      .slice(0, 4)
      .map((p) => {
        const initials = p.name
          .split(" ")
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return `<span class="avatar-mini" title="${escapeHtml(p.name)}">${escapeHtml(initials)}</span>`;
      })
      .join("");

    const extraCount = meeting.participants.length > 4 ? `+${meeting.participants.length - 4}` : "";

    card.innerHTML = `
      <div class="meeting-info">
        <div class="meeting-title">
          <span>${escapeHtml(meeting.title)}</span>
          <span class="pill scheduled">Scheduled</span>
        </div>
        <div class="meeting-meta">
          <span>📅 ${escapeHtml(localDateTime(meeting.start_time))} – ${escapeHtml(localDateTime(meeting.end_time, { timeOnly: true }))}</span>
          <span class="attendee-cluster">
            ${avatarsHtml}
            ${extraCount ? `<small class="muted" style="margin-left:4px;">${extraCount}</small>` : ""}
          </span>
          <span class="muted" style="font-size:12px;">(${meeting.participants.map((p) => escapeHtml(p.name)).join(", ")})</span>
        </div>
      </div>
      <div class="meeting-actions">
        <button class="button subtle" data-action="copy" data-id="${meeting.id}" title="Copy meeting details to clipboard" type="button">📋 Copy</button>
        <button class="button subtle" data-action="ics" data-id="${meeting.id}" title="Export .ics calendar invite" type="button">📅 .ics</button>
        <button class="button danger" data-action="cancel" data-id="${meeting.id}" type="button">Cancel</button>
      </div>
    `;
    fragment.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

function renderNotifications(notifications) {
  const container = document.querySelector("#notification-list");
  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <svg class="empty-icon" style="width:36px; height:36px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        <div class="empty-title" style="font-size:13.5px;">All caught up</div>
        <p class="empty-desc" style="font-size:12px; margin-bottom:0;">Automated 15-minute reminders will appear here when due.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  notifications.slice(0, 8).forEach((item) => {
    const card = document.createElement("article");
    card.className = "notification-card";

    const relTime = relativeTime(item.notify_at);
    const statusPill = item.sent
      ? '<span class="pill" style="font-size:10.5px;">✓ Delivered</span>'
      : `<span class="pill scheduled" style="font-size:10.5px;">⏱ Due ${escapeHtml(relTime || localDateTime(item.notify_at, { timeOnly: true }))}</span>`;

    card.innerHTML = `
      <p><strong>${escapeHtml(item.meeting_title)}</strong> — ${escapeHtml(item.message)}</p>
      <small>
        <span>👤 ${escapeHtml(item.participant_name)}</span>
        <span>·</span>
        ${statusPill}
      </small>
    `;
    fragment.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

// Event delegation for Dashboard
function initDashboardDelegation() {
  const meetingContainer = document.querySelector("#meeting-list");
  if (meetingContainer) {
    meetingContainer.addEventListener("click", async (e) => {
      const button = e.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const meetingId = button.dataset.id;

      if (action === "cancel") {
        const confirmed = await showConfirmModal(
          "Cancel Meeting",
          "Are you sure you want to cancel this meeting? All attendees will be notified.",
          "Yes, Cancel Meeting",
          true
        );
        if (!confirmed) return;

        button.disabled = true;
        try {
          await api(`/meetings/${meetingId}`, { method: "DELETE" });
          showToast("Meeting cancelled successfully.", "success");
          await loadDashboard();
        } catch (err) {
          button.disabled = false;
          showToast(err.message, "error");
        }
      } else if (action === "ics") {
        window.location.href = `/meetings/${meetingId}/ics`;
        showToast("Calendar (.ics) invite downloaded!", "success");
      } else if (action === "copy") {
        try {
          const card = button.closest(".meeting-card");
          const title = card.querySelector(".meeting-title span").textContent;
          const meta = card.querySelector(".meeting-meta").textContent.replace(/\s+/g, " ").trim();
          const textToCopy = `Meeting: ${title}\nSchedule: ${meta}`;
          await navigator.clipboard.writeText(textToCopy);
          showToast("Meeting details copied to clipboard!", "success");
        } catch {
          showToast("Could not copy to clipboard.", "error");
        }
      }
    });
  }

  const checkBtn = document.querySelector("#check-reminders-btn");
  if (checkBtn) {
    checkBtn.addEventListener("click", async () => {
      try {
        checkBtn.disabled = true;
        checkBtn.textContent = "Checking…";
        const res = await api("/notifications/check-due", { method: "POST" });
        await loadDashboard();
        if (res.delivered > 0) {
          showToast(`${res.delivered} due reminder(s) delivered to attendees!`, "success");
        } else {
          showToast("No overdue reminders found. All up to date.", "info");
        }
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = "Check Due";
      }
    });
  }
}

// ==========================================================================
// Participants Controller
// ==========================================================================

async function loadParticipants() {
  try {
    const people = await getParticipants(true);
    renderParticipantsList(people);
    populateParticipantSelectors(people);
  } catch (error) {
    showToast(`Failed to load team: ${error.message}`, "error");
  }
}

function renderParticipantsList(people) {
  const list = document.querySelector("#participants-list");
  if (!list) return;

  const totalBadge = document.querySelector("#people-total");
  if (totalBadge) totalBadge.textContent = `${people.length} members`;

  if (!people.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" x2="19" y1="8" y2="14"/>
          <line x1="22" x2="16" y1="11" y2="11"/>
        </svg>
        <div class="empty-title">No team members registered</div>
        <p class="empty-desc">Add participants manually or load 6 demo members to get started immediately.</p>
        <button class="button primary small" id="empty-seed-btn" type="button">Seed Demo Team</button>
      </div>
    `;
    const emptySeed = list.querySelector("#empty-seed-btn");
    if (emptySeed) {
      emptySeed.addEventListener("click", () => document.querySelector("#seed-demo-btn").click());
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  people.forEach((person) => {
    const initials = person.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const card = document.createElement("article");
    card.className = "person-card";
    card.innerHTML = `
      <div class="person-main">
        <span class="avatar">${escapeHtml(initials)}</span>
        <div>
          <div class="person-name">${escapeHtml(person.name)}</div>
          <div class="person-details">
            <span>${escapeHtml(person.email)}</span> · 
            <span class="pill" style="font-size:10.5px;">${escapeHtml(person.timezone)}</span> · 
            <span>⏰ ${escapeHtml(person.work_start)}–${escapeHtml(person.work_end)}</span>
          </div>
        </div>
      </div>
      <button class="button danger small" data-action="delete-person" data-id="${person.id}" data-name="${escapeHtml(person.name)}" type="button" aria-label="Delete ${escapeHtml(person.name)}">Delete</button>
    `;
    fragment.appendChild(card);
  });

  list.innerHTML = "";
  list.appendChild(fragment);
}

function populateParticipantSelectors(people) {
  // Populate checkbox selectors on Schedule page
  const requiredContainer = document.querySelector("#participant-options");
  const optionalContainer = document.querySelector("#optional-participant-options");

  if (requiredContainer && optionalContainer) {
    const reqFrag = document.createDocumentFragment();
    const optFrag = document.createDocumentFragment();

    people.forEach((person) => {
      const reqLabel = document.createElement("label");
      reqLabel.className = "check-option";
      reqLabel.innerHTML = `
        <input type="checkbox" name="participant" value="${person.id}">
        <span>${escapeHtml(person.name)} <span class="muted">(${escapeHtml(person.timezone)})</span></span>
      `;
      reqFrag.appendChild(reqLabel);

      const optLabel = document.createElement("label");
      optLabel.className = "check-option";
      optLabel.innerHTML = `
        <input type="checkbox" name="optional-participant" value="${person.id}">
        <span>${escapeHtml(person.name)} <span class="muted">(${escapeHtml(person.timezone)})</span></span>
      `;
      optFrag.appendChild(optLabel);
    });

    requiredContainer.innerHTML = "";
    requiredContainer.appendChild(reqFrag);

    optionalContainer.innerHTML = "";
    optionalContainer.appendChild(optFrag);
  }

  // Populate participant select in Add Busy Slot form
  const busySelect = document.querySelector("#busy-participant-select");
  if (busySelect) {
    busySelect.innerHTML =
      '<option value="">Select participant…</option>' +
      people
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.timezone)})</option>`)
        .join("");
  }
}

function initParticipantsController() {
  const list = document.querySelector("#participants-list");
  if (list) {
    list.addEventListener("click", async (e) => {
      const button = e.target.closest("button[data-action='delete-person']");
      if (!button) return;

      const personId = button.dataset.id;
      const personName = button.dataset.name;

      const confirmed = await showConfirmModal(
        `Delete ${personName}?`,
        `Are you sure you want to delete ${personName} and all associated calendar data? This action cannot be undone.`,
        "Yes, Delete",
        true
      );
      if (!confirmed) return;

      button.disabled = true;
      try {
        await api(`/participants/${personId}`, { method: "DELETE" });
        invalidateParticipantsCache();
        showToast(`${personName} removed from directory.`, "success");
        await loadParticipants();
      } catch (err) {
        button.disabled = false;
        showToast(err.message, "error");
      }
    });
  }

  // Add Participant Form with inline validation
  const form = document.querySelector("#participant-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      // Validation
      if (!data.name || !data.email || !data.timezone || !data.work_start || !data.work_end) {
        return showToast("Please fill in all participant fields.", "warning");
      }

      if (data.work_end <= data.work_start) {
        return showToast("Work End time must be later than Work Start time.", "warning");
      }

      const submitBtn = form.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Adding…";

      try {
        await api("/participants", { method: "POST", body: JSON.stringify(data) });
        invalidateParticipantsCache();
        form.reset();
        form.elements.timezone.value = "Asia/Kolkata";
        form.elements.work_start.value = "09:00";
        form.elements.work_end.value = "17:00";
        showToast(`Added ${data.name} to team directory!`, "success");
        await loadParticipants();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add to Directory";
      }
    });
  }

  // Seed Demo Data button
  const seedBtn = document.querySelector("#seed-demo-btn");
  if (seedBtn) {
    seedBtn.addEventListener("click", async () => {
      try {
        seedBtn.disabled = true;
        seedBtn.textContent = "Seeding…";
        await api("/seed-demo-data", { method: "POST" });
        invalidateParticipantsCache();
        showToast("Demo team profiles and realistic busy blocks seeded!", "success");
        await loadParticipants();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        seedBtn.disabled = false;
        seedBtn.textContent = "Seed Demo Team";
      }
    });
  }

  // Quick Add Busy Slot Form
  const busyForm = document.querySelector("#busy-slot-form");
  if (busyForm) {
    busyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pid = Number(document.querySelector("#busy-participant-select").value);
      const title = document.querySelector("#busy-title").value.trim() || "Busy";
      const startVal = document.querySelector("#busy-start-time").value;
      const endVal = document.querySelector("#busy-end-time").value;

      if (!pid || !startVal || !endVal) {
        return showToast("Please fill in all busy block fields.", "warning");
      }

      if (new Date(endVal) <= new Date(startVal)) {
        return showToast("Block end time must be after start time.", "warning");
      }

      const submitBtn = busyForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Recording…";

      try {
        await api("/busy-slots", {
          method: "POST",
          body: JSON.stringify({
            participant_id: pid,
            title,
            start_time: new Date(startVal).toISOString(),
            end_time: new Date(endVal).toISOString(),
          }),
        });
        showToast(`Calendar blocker '${title}' recorded!`, "success");
        busyForm.reset();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Block Calendar Slot";
      }
    });
  }
}

// ==========================================================================
// Schedule Page & Suggestions Engine
// ==========================================================================

async function initScheduleController() {
  await loadParticipants();

  const dateInput = document.querySelector("#meeting-date");
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  }

  // Prompt chips fill and auto-parse
  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      const nlInput = document.querySelector("#natural-language");
      if (nlInput) {
        nlInput.value = prompt;
        document.querySelector("#parse-button").click();
      }
    });
  });

  // NLP Parse button
  const parseBtn = document.querySelector("#parse-button");
  if (parseBtn) {
    parseBtn.addEventListener("click", async () => {
      const text = document.querySelector("#natural-language").value.trim();
      if (!text) return showToast("Enter a request in the AI box first.", "warning");

      parseBtn.disabled = true;
      parseBtn.textContent = "Parsing…";

      try {
        const timezone = document.querySelector("#meeting-timezone").value || "Asia/Kolkata";
        const parsed = await api("/parse-request", {
          method: "POST",
          body: JSON.stringify({ text, timezone }),
        });

        document.querySelector("#meeting-title").value = parsed.title;
        document.querySelector("#meeting-date").value = parsed.date;
        document.querySelector("#meeting-duration").value = String(parsed.duration_minutes);

        if (parsed.preferred_start) {
          document.querySelector("#preferred-window").value =
            parsed.preferred_start === "09:00" ? "morning" : parsed.preferred_start === "13:00" ? "afternoon" : "evening";
        }

        document.querySelectorAll('input[name="participant"]').forEach((cb) => {
          cb.checked = parsed.participant_ids.includes(Number(cb.value));
        });

        showToast(
          `✨ Understood: "${parsed.title}" on ${parsed.date} (${parsed.duration_minutes}m)${
            parsed.participant_names.length ? ` with ${parsed.participant_names.join(", ")}` : ""
          }`,
          "success",
          4500
        );
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        parseBtn.disabled = false;
        parseBtn.textContent = "Parse & Fill";
      }
    });
  }

  // Meeting Form Submit
  const meetingForm = document.querySelector("#meeting-form");
  if (meetingForm) {
    meetingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.querySelector("#meeting-title").value.trim();
      const date = dateInput.value;
      const duration = Number(document.querySelector("#meeting-duration").value);
      const timezone = document.querySelector("#meeting-timezone").value;

      if (!title) return showToast("Please specify a meeting title.", "warning");
      if (!date) return showToast("Please choose a target date.", "warning");

      const participantIds = [...document.querySelectorAll('input[name="participant"]:checked')].map((cb) => Number(cb.value));
      if (!participantIds.length) {
        return showToast("Please select at least one REQUIRED participant.", "warning");
      }

      const optionalParticipantIds = [...document.querySelectorAll('input[name="optional-participant"]:checked')]
        .map((cb) => Number(cb.value))
        .filter((id) => !participantIds.includes(id));

      const windowVal = document.querySelector("#preferred-window").value;
      const preferred = {
        morning: ["09:00", "12:00"],
        afternoon: ["13:00", "17:00"],
        evening: ["17:00", "20:00"],
      }[windowVal];

      const request = {
        title,
        date,
        duration_minutes: duration,
        participant_ids: participantIds,
        optional_participant_ids: optionalParticipantIds,
        timezone,
        preferred_start: preferred ? preferred[0] : null,
        preferred_end: preferred ? preferred[1] : null,
      };

      const submitBtn = meetingForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Scanning Calendars…</span>';

      const section = document.querySelector("#suggestion-section");
      const target = document.querySelector("#suggestions");
      section.classList.remove("hidden");
      target.innerHTML = `
        <div class="skeleton skeleton-card" style="height:90px;"></div>
        <div class="skeleton skeleton-card" style="height:90px;"></div>
      `;

      try {
        const result = await api("/meetings/suggest", {
          method: "POST",
          body: JSON.stringify(request),
        });
        renderSuggestions(result, request);
      } catch (err) {
        showToast(err.message, "error");
        target.innerHTML = `<div class="message error">${escapeHtml(err.message)}</div>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Find Best Available Times</span> <span aria-hidden="true">→</span>';
      }
    });
  }
}

function renderSuggestions(result, request) {
  const section = document.querySelector("#suggestion-section");
  const target = document.querySelector("#suggestions");
  section.classList.remove("hidden");

  // Conflict Detected: No Slots Available
  if (!result.slots.length) {
    const blockers = result.blocking_participants && result.blocking_participants.length
      ? ` <strong>Busy schedule for:</strong> ${result.blocking_participants.map(escapeHtml).join(", ")}.`
      : "";

    let alternativeHtml = "";
    if (result.nearest_alternative_day) {
      alternativeHtml = `
        <div class="alternative-box">
          <div style="font-weight:700; margin-bottom:8px; font-size:15px; display:flex; align-items:center; gap:8px;">
            <span>⚠️ Schedule Conflict Detected</span>
          </div>
          <p style="margin-bottom:12px;">No common free slot found for all required participants on <strong>${escapeHtml(request.date)}</strong>.${blockers}</p>
          <div style="padding:12px 16px; background:var(--surface); border-radius:8px; border:1px solid var(--amber-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>Suggested Alternative Date:</strong>
              <span style="margin-left:6px; color:var(--emerald-dark); font-weight:700;">${escapeHtml(result.nearest_alternative_day.date)}</span>
              <span class="muted" style="font-size:12px; margin-left:6px;">(${result.nearest_alternative_day.slots.length} free slot(s))</span>
            </div>
            <button type="button" class="button primary small" data-action="switch-date" data-date="${escapeHtml(result.nearest_alternative_day.date)}">
              Switch to ${escapeHtml(result.nearest_alternative_day.date)} →
            </button>
          </div>
        </div>
      `;
    } else {
      alternativeHtml = `
        <div class="alternative-box">
          <div style="font-weight:700; margin-bottom:6px; font-size:15px;">⚠️ Schedule Conflict Detected</div>
          <p>No common free slot found within the next 7 days for this group.${blockers}</p>
        </div>
      `;
    }

    target.innerHTML = alternativeHtml;

    const switchBtn = target.querySelector("[data-action='switch-date']");
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        document.querySelector("#meeting-date").value = switchBtn.dataset.date;
        document.querySelector("#meeting-form").requestSubmit();
      });
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  // Slots Found: Render Ranked Time Slot Cards
  const fragment = document.createDocumentFragment();
  result.slots.slice(0, 10).forEach((slot, index) => {
    const isTopMatch = index === 0;
    const card = document.createElement("article");
    card.className = `slot-card ${isTopMatch ? "best-match" : ""}`;

    const scoreBadge = `<span class="slot-score">${isTopMatch ? "★ Best Match · " : ""}Score: ${slot.score || 90}/100</span>`;
    const optBadge = slot.available_optional_participants > 0
      ? `<span class="slot-badge success">👥 ${slot.available_optional_participants} Optional Free</span>`
      : "";
    const windowBadge = slot.within_preferred_window
      ? '<span class="slot-badge success">✓ Preferred Window</span>'
      : "";
    const lunchBadge = slot.avoids_lunch
      ? '<span class="slot-badge success">🍽 Avoids Lunch</span>'
      : '<span class="slot-badge warning">Overlaps Lunch</span>';

    let localTimesHtml = "";
    if (slot.participant_local_times && Object.keys(slot.participant_local_times).length) {
      const timesList = Object.entries(slot.participant_local_times)
        .map(([name, t]) => `${escapeHtml(name)}: <strong>${escapeHtml(t)}</strong>`)
        .join(" &nbsp;·&nbsp; ");
      localTimesHtml = `<div class="local-times-box">🌐 ${timesList}</div>`;
    }

    card.innerHTML = `
      <div>
        <div class="slot-title">
          <span>⏰ ${escapeHtml(localDateTime(slot.start_time))} – ${escapeHtml(localDateTime(slot.end_time, { timeOnly: true }))}</span>
          ${scoreBadge}
        </div>
        <div class="slot-badges">
          ${windowBadge}
          ${lunchBadge}
          ${optBadge}
          <span class="slot-badge">🛡 Clean Buffer</span>
        </div>
        ${localTimesHtml}
      </div>
      <button class="button primary small" data-action="confirm-slot" data-index="${index}" type="button">Confirm & Book</button>
    `;
    fragment.appendChild(card);
  });

  target.innerHTML = "";
  target.appendChild(fragment);

  // Delegation for confirming a slot
  target.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='confirm-slot']");
    if (!btn) return;

    const slot = result.slots[Number(btn.dataset.index)];
    btn.disabled = true;
    btn.textContent = "Confirming…";

    try {
      const confirmedMeeting = await api("/meetings/confirm", {
        method: "POST",
        body: JSON.stringify({
          title: request.title,
          start_time: slot.start_time,
          end_time: slot.end_time,
          participant_ids: request.participant_ids,
          optional_participant_ids: request.optional_participant_ids,
          timezone: request.timezone,
        }),
      });

      showToast(`🎉 "${request.title}" confirmed and booked!`, "success", 5000);
      target.innerHTML = `
        <div class="alternative-box" style="background:var(--emerald-light); border-color:var(--emerald-border); color:var(--emerald-dark);">
          <strong style="color:var(--emerald-dark); font-size:16px;">🎉 Meeting Successfully Confirmed!</strong><br>
          "${escapeHtml(request.title)}" is booked for <strong>${escapeHtml(localDateTime(slot.start_time))}</strong>.<br>
          Automated 15-minute reminders have been dispatched for all attendee calendars.
          <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <a href="/" class="button primary small">View on Dashboard →</a>
            <a href="/meetings/${confirmedMeeting.id}/ics" class="button secondary small">Download Calendar .ics</a>
          </div>
        </div>
      `;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Confirm & Book";
      showToast(err.message, "error");
    }
  }, { once: true });

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==========================================================================
// Page Visibility Aware Background Polling (35s)
// ==========================================================================

function initBackgroundNotificationPolling() {
  const page = document.body.dataset.page;
  if (page !== "dashboard") return;

  setInterval(async () => {
    if (document.visibilityState === "visible") {
      try {
        const reminders = await api("/notifications");
        renderNotifications(reminders.notifications);
        const unreadCount = reminders.notifications.filter((n) => n.sent).length;
        const countEl = document.querySelector("#reminder-count");
        if (countEl) countEl.textContent = unreadCount;
      } catch {
        // Silent fail on background poll
      }
    }
  }, 35000);

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      try {
        const reminders = await api("/notifications");
        renderNotifications(reminders.notifications);
      } catch {
        // Silent fail
      }
    }
  });
}

// ==========================================================================
// Authentication State & Admin Panel
// ==========================================================================

let activeUser = null;

async function checkAuthAndInitUser() {
  try {
    const user = await api("/auth/me");
    if (!user || !user.id) {
      window.location.replace("/login");
      return null;
    }
    activeUser = user;
    renderUserNavigation(user);
    return user;
  } catch (err) {
    window.location.replace("/login");
    return null;
  }
}

function renderUserNavigation(user) {
  const container = document.querySelector("#user-nav-container");
  if (!container) return;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  container.innerHTML = `
    <div class="user-pill">
      <span class="user-avatar-badge">${escapeHtml(initials)}</span>
      <span>${escapeHtml(user.name)}</span>
      <span class="user-role-badge ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span>
    </div>
    <button id="logout-btn" type="button" class="btn-logout" title="Sign out">Sign Out</button>
  `;

  const logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {}
      window.location.replace("/login");
    });
  }
}

async function initAdminPanel() {
  const panel = document.querySelector("#admin-panel");
  const listEl = document.querySelector("#admin-users-list");
  if (!panel || !listEl || !activeUser || activeUser.role !== "admin") return;

  panel.style.display = "block";

  try {
    const users = await api("/auth/users");
    if (!users || users.length === 0) {
      listEl.innerHTML = `<tr><td colspan="5" class="muted">No other users registered.</td></tr>`;
      return;
    }

    listEl.innerHTML = users.map((u) => {
      const isSelf = u.id === activeUser.id;
      const nextRole = u.role === "admin" ? "member" : "admin";
      const actionBtn = isSelf
        ? `<span class="muted" style="font-size:12px;">(Current user)</span>`
        : `<button type="button" class="btn-role-toggle" data-user-id="${u.id}" data-new-role="${nextRole}">Change to ${nextRole}</button>`;

      return `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="user-role-badge ${escapeHtml(u.role)}">${escapeHtml(u.role)}</span></td>
          <td>${escapeHtml(localDateTime(u.created_at, { dateOnly: true }))}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join("");

    listEl.querySelectorAll(".btn-role-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.userId;
        const newRole = btn.dataset.newRole;
        try {
          btn.disabled = true;
          await api(`/auth/users/${userId}/role`, {
            method: "PUT",
            body: JSON.stringify({ role: newRole }),
          });
          showToast(`Updated user role to ${newRole}`, "success");
          await initAdminPanel();
        } catch (err) {
          btn.disabled = false;
          showToast(err.message, "error");
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<tr><td colspan="5" class="muted">Failed to load users: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ==========================================================================
// Lifecycle Initialization
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  try {
    const user = await checkAuthAndInitUser();
    if (!user) return; // redirecting to /login

    if (page === "dashboard") {
      const heading = document.querySelector("#welcome-heading");
      if (heading) {
        heading.textContent = `Welcome, ${user.name}! Smart scheduling across timezones.`;
      }
      initDashboardDelegation();
      await loadDashboard();
      initBackgroundNotificationPolling();
      if (user.role === "admin") {
        await initAdminPanel();
      }
    } else if (page === "participants") {
      initParticipantsController();
      await loadParticipants();
    } else if (page === "schedule") {
      await initScheduleController();
    }
  } catch (error) {
    showToast(`Notice: ${error.message}`, "error");
    console.error("Initialization error:", error);
  }
});

