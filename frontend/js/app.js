
// ==========================================================================
// Dark / Light Theme Mode Controller
// ==========================================================================

function initThemeToggle() {
  const storedTheme = localStorage.getItem("meetwise-theme") || localStorage.getItem("meetwise_theme") || "dark";
  document.documentElement.setAttribute("data-theme", storedTheme);
  localStorage.setItem("meetwise-theme", storedTheme);
  localStorage.setItem("meetwise_theme", storedTheme);

  document.querySelectorAll(".theme-icon, #theme-icon").forEach((icon) => {
    icon.textContent = storedTheme === "light" ? "☀️" : "🌙";
  });
  const themeText = document.getElementById("theme-text");
  if (themeText) {
    themeText.textContent = storedTheme === "light" ? "Dark" : "Light";
  }

  document.querySelectorAll(".btn-theme-toggle, .theme-toggle-btn, #theme-toggle").forEach((btn) => {
    btn.onclick = (e) => {
      if (e) e.preventDefault();
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("meetwise-theme", next);
      localStorage.setItem("meetwise_theme", next);

      document.querySelectorAll(".theme-icon, #theme-icon").forEach((icon) => {
        icon.textContent = next === "light" ? "☀️" : "🌙";
      });
      const tText = document.getElementById("theme-text");
      if (tText) {
        tText.textContent = next === "light" ? "Dark" : "Light";
      }

      showToast(`Switched to ${next} mode`, "info", 1800);
      if (typeof adminAnalyticsData !== "undefined" && adminAnalyticsData) {
        renderAnalyticsCharts(adminAnalyticsData);
      }
    };
  });
}

// Immediate theme execution to prevent screen flash
(function() {
  const theme = localStorage.getItem("meetwise-theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
})();

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
        <button class="button small btn-jitsi-call" data-action="jitsi" data-url="${escapeHtml(meeting.meeting_url || `https://meet.jit.si/MeetWise-${meeting.id}`)}" data-title="${escapeHtml(meeting.title)}" type="button" title="Join Jitsi Video Call">🎥 Join Call</button>
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
      } else if (action === "jitsi") {
        const url = button.dataset.url;
        const title = button.dataset.title || "Meeting Call";
        const jitsiModal = document.querySelector("#jitsi-modal");
        const jitsiIframe = document.querySelector("#jitsi-iframe");
        const jitsiTitle = document.querySelector("#jitsi-modal-title");
        const jitsiExternal = document.querySelector("#jitsi-open-external");
        if (jitsiModal && jitsiIframe) {
          if (jitsiTitle) jitsiTitle.textContent = `🎥 ${title}`;
          jitsiIframe.src = url;
          if (jitsiExternal) jitsiExternal.href = url;
          jitsiModal.classList.remove("hidden");
        } else {
          window.open(url, "_blank");
        }
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

  
  const jitsiModal = document.querySelector("#jitsi-modal");
  const jitsiCloseBtn = document.querySelector("#jitsi-modal-close");
  if (jitsiModal && jitsiCloseBtn) {
    jitsiCloseBtn.addEventListener("click", () => {
      const iframe = document.querySelector("#jitsi-iframe");
      if (iframe) iframe.src = "";
      jitsiModal.classList.add("hidden");
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

      const jitsiUrl = confirmedMeeting.meeting_url || `https://meet.jit.si/MeetWise-${confirmedMeeting.id}`;
      showToast(`🎉 "${request.title}" confirmed! Confirmation emails with Jitsi video links sent to all attendees.`, "success", 6000);
      target.innerHTML = `
        <div class="alternative-box" style="background:var(--emerald-light); border-color:var(--emerald-border); color:var(--emerald-dark);">
          <strong style="color:var(--emerald-dark); font-size:16px;">🎉 Meeting Successfully Confirmed!</strong><br>
          "${escapeHtml(request.title)}" is booked for <strong>${escapeHtml(localDateTime(slot.start_time))}</strong>.<br>
          📧 Full timings and Jitsi video conference details have been emailed to all attendees and your registered email address.<br>
          <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <a href="${jitsiUrl}" target="_blank" class="button small btn-jitsi-call">🎥 Attend Jitsi Meeting Room →</a>
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

const AVATAR_PRESETS = [
  { id: "fox", name: "Cyber Fox", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23f97316'/><polygon points='25,20 40,45 15,45' fill='%23c2410c'/><polygon points='75,20 60,45 85,45' fill='%23c2410c'/><polygon points='50,75 25,45 75,45' fill='%23ffffff'/><polygon points='50,75 42,65 58,65' fill='%231e293b'/><circle cx='38' cy='52' r='4' fill='%230f172a'/><circle cx='62' cy='52' r='4' fill='%230f172a'/></svg>" },
  { id: "astro", name: "Astronaut", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%231e1b4b'/><circle cx='50' cy='50' r='32' fill='%2338bdf8'/><rect x='30' y='38' width='40' height='24' rx='12' fill='%230f172a'/><circle cx='42' cy='48' r='4' fill='%2338bdf8'/><circle cx='58' cy='48' r='4' fill='%2338bdf8'/></svg>" },
  { id: "bolt", name: "Electric Amber", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23f59e0b'/><polygon points='52,15 28,52 48,52 44,85 72,44 52,44' fill='%23ffffff'/></svg>" },
  { id: "violet", name: "Holo Violet", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%238b5cf6'/><circle cx='50' cy='42' r='18' fill='%23ec4899'/><path d='M26,82 C26,65 74,65 74,82' fill='%23c084fc'/></svg>" },
  { id: "owl", name: "Wisdom Teal", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%230d9488'/><circle cx='38' cy='46' r='14' fill='%23ffffff'/><circle cx='62' cy='46' r='14' fill='%23ffffff'/><circle cx='38' cy='46' r='6' fill='%230f172a'/><circle cx='62' cy='46' r='6' fill='%230f172a'/><polygon points='50,56 45,66 55,66' fill='%23f59e0b'/></svg>" },
  { id: "diamond", name: "Diamond", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2306b6d4'/><polygon points='50,18 80,45 50,82 20,45' fill='%23e0f2fe'/><polygon points='50,18 68,45 50,82 32,45' fill='%23bae6fd'/><polygon points='50,18 50,82' stroke='%2338bdf8' stroke-width='2'/></svg>" },
  { id: "emerald", name: "Emerald Pro", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2310b981'/><circle cx='50' cy='42' r='18' fill='%23ffffff'/><path d='M24,84 C24,66 76,66 76,84' fill='%23d1fae5'/></svg>" },
  { id: "robot", name: "Cyber Bot", url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23334155'/><rect x='28' y='32' width='44' height='36' rx='8' fill='%23e2e8f0'/><circle cx='40' cy='48' r='5' fill='%233b82f6'/><circle cx='60' cy='48' r='5' fill='%233b82f6'/><rect x='42' y='58' width='16' height='4' rx='2' fill='%2364748b'/><line x1='50' y1='20' x2='50' y2='32' stroke='%23e2e8f0' stroke-width='4'/><circle cx='50' cy='18' r='4' fill='%23ef4444'/></svg>" },
];

let selectedProfileAvatar = null;
let profileModalInitialized = false;

function renderUserNavigation(user) {
  const container = document.querySelector("#user-nav-container");
  if (!container) return;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const isAdmin = user.role === "admin";
  const roleBadgeHtml = isAdmin
    ? `<span class="user-role-badge supreme-admin" title="Supreme Administrator Privileges Active">👑 SUPREME ADMIN</span>`
    : `<span class="user-role-badge ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span>`;

  const avatarHtml = user.avatar_url
    ? `<img class="user-avatar-img ${isAdmin ? 'supreme-avatar-ring' : ''}" src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.name)}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='grid';" /><span class="user-avatar-badge ${isAdmin ? 'supreme-avatar' : ''}" style="display:none;">${escapeHtml(initials)}</span>`
    : `<span class="user-avatar-badge ${isAdmin ? 'supreme-avatar' : ''}">${escapeHtml(initials)}</span>`;

  container.innerHTML = `
    <div class="user-pill ${isAdmin ? 'supreme-pill' : ''}" id="user-profile-pill" role="button" tabindex="0" title="Click to view & edit your profile details and avatar">
      <div class="user-avatar-wrapper">
        ${avatarHtml}
        <span class="user-avatar-edit-hint" title="Change Avatar">📷</span>
      </div>
      <div class="user-meta-info">
        <span class="user-meta-name">${escapeHtml(user.name)}</span>
        <span class="user-meta-email">${escapeHtml(user.email)}</span>
      </div>
      ${roleBadgeHtml}
    </div>
    <button id="logout-btn" type="button" class="btn-logout" title="Sign out">Sign Out</button>
  `;

  const profilePill = document.querySelector("#user-profile-pill");
  if (profilePill) {
    profilePill.addEventListener("click", () => openProfileModal());
    profilePill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProfileModal();
      }
    });
  }

  const logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {}
      window.location.replace("/login");
    });
  }

  initProfileModal();
}

function openProfileModal() {
  const modal = document.querySelector("#profile-modal");
  if (!modal || !activeUser) return;

  selectedProfileAvatar = activeUser.avatar_url || null;

  const nameInput = document.querySelector("#profile-name-input");
  const emailInput = document.querySelector("#profile-email-input");
  const heroName = document.querySelector("#profile-hero-name");
  const heroEmail = document.querySelector("#profile-hero-email");
  const badgeContainer = document.querySelector("#profile-hero-badge-container");

  if (nameInput) nameInput.value = activeUser.name || "";
  if (emailInput) emailInput.value = activeUser.email || "";
  if (heroName) heroName.textContent = activeUser.name || "";
  if (heroEmail) heroEmail.textContent = activeUser.email || "";

  if (badgeContainer) {
    const isAdmin = activeUser.role === "admin";
    badgeContainer.innerHTML = isAdmin
      ? `<span class="user-role-badge supreme-admin">👑 SUPREME ADMIN</span>`
      : `<span class="user-role-badge member">Member</span>`;
  }

  const currentPwd = document.querySelector("#profile-current-pwd");
  const newPwd = document.querySelector("#profile-new-pwd");
  const confirmPwd = document.querySelector("#profile-confirm-pwd");
  if (currentPwd) currentPwd.value = "";
  if (newPwd) newPwd.value = "";
  if (confirmPwd) confirmPwd.value = "";

  const alertBox = document.querySelector("#profile-modal-alert");
  if (alertBox) {
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }

  updateProfileModalAvatarPreview(selectedProfileAvatar);
  highlightActiveAvatarPreset(selectedProfileAvatar);

  modal.classList.remove("hidden");
}

function updateProfileModalAvatarPreview(avatarUrl) {
  const img = document.querySelector("#profile-modal-avatar-img");
  const fallback = document.querySelector("#profile-modal-avatar-fallback");
  const initials = activeUser?.name
    ? activeUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  if (avatarUrl) {
    if (img) {
      img.src = avatarUrl;
      img.style.display = "block";
    }
    if (fallback) fallback.style.display = "none";
  } else {
    if (img) img.style.display = "none";
    if (fallback) {
      fallback.textContent = initials;
      fallback.style.display = "flex";
    }
  }
}

function highlightActiveAvatarPreset(url) {
  document.querySelectorAll(".avatar-preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.url === url);
  });
}

function initProfileModal() {
  const modal = document.querySelector("#profile-modal");
  if (!modal || profileModalInitialized) return;
  profileModalInitialized = true;

  // 1. Render Preset Avatars
  const presetsContainer = document.querySelector("#avatar-presets-grid");
  if (presetsContainer) {
    presetsContainer.innerHTML = AVATAR_PRESETS.map((p) => `
      <button type="button" class="avatar-preset-btn" data-url="${escapeHtml(p.url)}" title="${escapeHtml(p.name)}">
        <img class="avatar-preset-svg" src="${escapeHtml(p.url)}" alt="${escapeHtml(p.name)}" />
      </button>
    `).join("");

    presetsContainer.querySelectorAll(".avatar-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedProfileAvatar = btn.dataset.url;
        updateProfileModalAvatarPreview(selectedProfileAvatar);
        highlightActiveAvatarPreset(selectedProfileAvatar);
        showToast("Avatar preset selected! Click 'Save Changes' to apply.", "info", 2000);
      });
    });
  }

  // 2. Avatar Trigger Click -> Opens file selector or toggles picker
  const avatarTrigger = document.querySelector("#profile-avatar-trigger");
  const fileInput = document.querySelector("#profile-avatar-file-input");
  if (avatarTrigger && fileInput) {
    avatarTrigger.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // 3. Upload Button Click
  const btnUpload = document.querySelector("#btn-upload-avatar");
  if (btnUpload && fileInput) {
    btnUpload.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // 4. Handle File Input Change with Compression
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file (PNG, JPG, WebP)", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext("2d");
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);
          selectedProfileAvatar = canvas.toDataURL("image/webp", 0.88);
          updateProfileModalAvatarPreview(selectedProfileAvatar);
          highlightActiveAvatarPreset(selectedProfileAvatar);
          showToast("Photo loaded! Click 'Save Changes' to update your account.", "info", 2500);
        };
        img.src = loadEvt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 5. Apply Custom URL
  const btnApplyUrl = document.querySelector("#btn-apply-avatar-url");
  const urlInput = document.querySelector("#profile-avatar-url-input");
  if (btnApplyUrl && urlInput) {
    btnApplyUrl.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:"))) {
        showToast("Please enter a valid image URL starting with https://", "error");
        return;
      }
      selectedProfileAvatar = url;
      updateProfileModalAvatarPreview(selectedProfileAvatar);
      highlightActiveAvatarPreset(selectedProfileAvatar);
      showToast("Custom URL loaded! Click 'Save Changes' to apply.", "info", 2000);
    });
  }

  // 6. Password Accordion Toggle
  const btnTogglePwd = document.querySelector("#btn-toggle-password-change");
  const pwdFields = document.querySelector("#password-change-fields");
  const arrowIcon = document.querySelector("#accordion-arrow-icon");
  if (btnTogglePwd && pwdFields) {
    btnTogglePwd.addEventListener("click", () => {
      const isHidden = pwdFields.style.display === "none";
      pwdFields.style.display = isHidden ? "flex" : "none";
      if (arrowIcon) arrowIcon.classList.toggle("open", isHidden);
    });
  }

  // 7. Modal Close & Cancel
  const closeModal = () => {
    modal.classList.add("hidden");
  };

  const closeBtn = document.querySelector("#profile-modal-close");
  const cancelBtn = document.querySelector("#profile-modal-cancel");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // 8. Form Submission (PUT /auth/me)
  const form = document.querySelector("#profile-edit-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertBox = document.querySelector("#profile-modal-alert");
      const submitBtn = document.querySelector("#profile-modal-submit");

      const nameVal = document.querySelector("#profile-name-input").value.trim();
      const emailVal = document.querySelector("#profile-email-input").value.trim();
      const currentPwdVal = document.querySelector("#profile-current-pwd")?.value || "";
      const newPwdVal = document.querySelector("#profile-new-pwd")?.value || "";
      const confirmPwdVal = document.querySelector("#profile-confirm-pwd")?.value || "";

      if (!nameVal) {
        showToast("Name is required", "error");
        return;
      }
      if (!emailVal) {
        showToast("Email is required", "error");
        return;
      }

      if (newPwdVal) {
        if (!currentPwdVal) {
          if (alertBox) {
            alertBox.textContent = "Please enter your current password to set a new password.";
            alertBox.style.display = "block";
          }
          showToast("Current password is required", "error");
          return;
        }
        if (newPwdVal.length < 8) {
          if (alertBox) {
            alertBox.textContent = "New password must be at least 8 characters long.";
            alertBox.style.display = "block";
          }
          showToast("Password must be at least 8 characters", "error");
          return;
        }
        if (newPwdVal !== confirmPwdVal) {
          if (alertBox) {
            alertBox.textContent = "New password and confirmation do not match.";
            alertBox.style.display = "block";
          }
          showToast("Passwords do not match", "error");
          return;
        }
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Saving...";
        }

        const payload = {
          name: nameVal,
          email: emailVal,
          avatar_url: selectedProfileAvatar,
        };
        if (newPwdVal) {
          payload.current_password = currentPwdVal;
          payload.new_password = newPwdVal;
        }

        const updated = await api("/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        activeUser = updated;
        renderUserNavigation(updated);

        const welcomeHeading = document.querySelector("#welcome-heading");
        if (welcomeHeading && updated.name) {
          welcomeHeading.textContent = `Welcome back, ${updated.name}! Smart scheduling across timezones.`;
        }

        showToast("Profile and avatar updated successfully! ✨", "success", 3000);
        closeModal();
      } catch (err) {
        if (alertBox) {
          alertBox.textContent = err.message || "Failed to update profile.";
          alertBox.style.display = "block";
        }
        showToast(err.message || "Failed to update profile", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Changes";
        }
      }
    });
  }
}

// ==========================================================================
// Admin Analytics Dashboard & User Management Controller
// ==========================================================================

let adminAnalyticsData = null;
let adminUsersData = [];
let adminSelectedDays = 30;
let adminActiveTab = "overview";
let adminInitialized = false;
const adminCharts = {};

function getChartThemeColors() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    textColor: isLight ? "#475569" : "#94a3b8",
    gridColor: isLight ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.07)",
    tooltipBg: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
    tooltipText: isLight ? "#0f172a" : "#f8fafc",
    tooltipBorder: isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.15)",
  };
}

function animateNumber(element, target, duration = 750, isFloat = false) {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();
  const targetNum = Number(target) || 0;

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 2);
    const current = start + (targetNum - start) * ease;
    element.textContent = isFloat ? current.toFixed(1) + "m" : Math.round(current).toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = isFloat ? targetNum.toFixed(1) + "m" : targetNum.toLocaleString();
    }
  }
  requestAnimationFrame(update);
}

function updateKPIValues(kpis) {
  if (!kpis) return;
  animateNumber(document.querySelector("#kpi-total-users"), kpis.total_users);
  animateNumber(document.querySelector("#kpi-total-participants"), kpis.total_participants);
  animateNumber(document.querySelector("#kpi-total-meetings"), kpis.total_meetings);
  animateNumber(document.querySelector("#kpi-upcoming-meetings"), kpis.upcoming_meetings);
  animateNumber(document.querySelector("#kpi-total-busy-slots"), kpis.total_busy_slots);
  animateNumber(document.querySelector("#kpi-pending-notifications"), kpis.pending_notifications);
  animateNumber(document.querySelector("#kpi-sent-notifications"), kpis.sent_notifications);
  animateNumber(document.querySelector("#kpi-avg-duration"), kpis.avg_meeting_minutes, 750, true);
}

function createOrUpdateChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (adminCharts[canvasId]) {
    adminCharts[canvasId].destroy();
    delete adminCharts[canvasId];
  }

  const parent = canvas.parentElement;
  const existingEmpty = parent.querySelector(".chart-empty-state");
  if (existingEmpty) existingEmpty.remove();

  const hasData = config.data && config.data.datasets && config.data.datasets.some((ds) => {
    return Array.isArray(ds.data) && ds.data.some((v) => (typeof v === "number" ? v > 0 : v !== null));
  });

  if (!hasData) {
    canvas.style.display = "none";
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "chart-empty-state";
    emptyDiv.innerHTML = `
      <div class="chart-empty-icon">📊</div>
      <strong>No meetings or records logged</strong>
      <p style="font-size:12px; color:var(--text-light);">Data will populate here once activities take place.</p>
    `;
    parent.appendChild(emptyDiv);
    return;
  }

  canvas.style.display = "block";

  if (typeof Chart === "undefined") {
    console.warn("Chart.js library is not available");
    return;
  }

  adminCharts[canvasId] = new Chart(canvas, config);
}

function renderAnalyticsCharts(data) {
  if (!data) return;
  const { textColor, gridColor, tooltipBg, tooltipText, tooltipBorder } = getChartThemeColors();

  const palette = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#3b82f6"];

  const tooltipOptions = {
    backgroundColor: tooltipBg,
    titleColor: tooltipText,
    bodyColor: tooltipText,
    borderColor: tooltipBorder,
    borderWidth: 1,
    padding: 10,
    boxPadding: 4,
  };

  const percentageTooltip = {
    ...tooltipOptions,
    callbacks: {
      label: function (ctx) {
        const label = ctx.label || "";
        const val = ctx.parsed || 0;
        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
        return ` ${label}: ${val} (${pct}%)`;
      },
    },
  };

  // 1. Overview: Meetings Activity Trend
  const dailyLabels = (data.meetings_per_day || []).map((d) => d.date.slice(5));
  const dailyCounts = (data.meetings_per_day || []).map((d) => d.count);
  createOrUpdateChart("chart-overview-meetings", {
    type: "line",
    data: {
      labels: dailyLabels,
      datasets: [
        {
          label: "Scheduled Meetings",
          data: dailyCounts,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.16)",
          fill: true,
          tension: 0.35,
          pointRadius: dailyLabels.length > 35 ? 1 : 3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, maxTicksLimit: 10 }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });

  // 2. Overview: Users by Role
  const roleLabels = (data.users_by_role || []).map((r) => r.label.toUpperCase());
  const roleValues = (data.users_by_role || []).map((r) => r.value);
  createOrUpdateChart("chart-users-role", {
    type: "doughnut",
    data: {
      labels: roleLabels,
      datasets: [
        {
          data: roleValues,
          backgroundColor: ["#f59e0b", "#6366f1"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { size: 12 } } },
        tooltip: percentageTooltip,
      },
      cutout: "68%",
    },
  });

  // 3. Overview: Meetings by Status
  const statusLabels = (data.meetings_by_status || []).map((s) => s.label.toUpperCase());
  const statusValues = (data.meetings_by_status || []).map((s) => s.value);
  createOrUpdateChart("chart-meetings-status", {
    type: "doughnut",
    data: {
      labels: statusLabels,
      datasets: [
        {
          data: statusValues,
          backgroundColor: ["#10b981", "#ef4444", "#8b5cf6"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { size: 12 } } },
        tooltip: percentageTooltip,
      },
      cutout: "68%",
    },
  });

  // 4. Overview: Notifications Sent vs Pending
  const notifLabels = (data.notifications_sent_vs_pending || []).map((n) => n.label);
  const notifValues = (data.notifications_sent_vs_pending || []).map((n) => n.value);
  createOrUpdateChart("chart-notifications-ratio", {
    type: "doughnut",
    data: {
      labels: notifLabels,
      datasets: [
        {
          data: notifValues,
          backgroundColor: ["#10b981", "#f59e0b"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: textColor, font: { size: 12 } } },
        tooltip: percentageTooltip,
      },
      cutout: "68%",
    },
  });

  // 5. Meetings: Full Timeline
  createOrUpdateChart("chart-meetings-timeline", {
    type: "line",
    data: {
      labels: (data.meetings_per_day || []).map((d) => d.date),
      datasets: [
        {
          label: "Meetings Volume",
          data: (data.meetings_per_day || []).map((d) => d.count),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.16)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, maxTicksLimit: 12 }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });

  // 6. Meetings: By Weekday
  createOrUpdateChart("chart-meetings-by-weekday", {
    type: "bar",
    data: {
      labels: (data.meetings_by_weekday || []).map((w) => w.day),
      datasets: [
        {
          label: "Meetings",
          data: (data.meetings_by_weekday || []).map((w) => w.count),
          backgroundColor: "#6366f1",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });

  // 7. Meetings: By Hour
  createOrUpdateChart("chart-meetings-by-hour", {
    type: "bar",
    data: {
      labels: (data.meetings_by_hour || []).map((h) => `${h.hour}:00`),
      datasets: [
        {
          label: "Meetings Starting",
          data: (data.meetings_by_hour || []).map((h) => h.count),
          backgroundColor: "#f59e0b",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, maxTicksLimit: 12 }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });

  // 8. Meetings: Duration Buckets
  createOrUpdateChart("chart-duration-buckets", {
    type: "bar",
    data: {
      labels: (data.meeting_duration_buckets || []).map((b) => b.bucket),
      datasets: [
        {
          label: "Meetings",
          data: (data.meeting_duration_buckets || []).map((b) => b.count),
          backgroundColor: ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899"],
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });

  // 9. Meetings: Status Detail
  createOrUpdateChart("chart-meetings-status-detail", {
    type: "doughnut",
    data: {
      labels: statusLabels,
      datasets: [
        {
          data: statusValues,
          backgroundColor: ["#10b981", "#ef4444", "#8b5cf6"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: textColor } }, tooltip: percentageTooltip },
      cutout: "65%",
    },
  });

  // 10. People: Participants by Timezone
  const tzLabels = (data.participants_by_timezone || []).map((t) => t.label);
  const tzValues = (data.participants_by_timezone || []).map((t) => t.value);
  createOrUpdateChart("chart-participants-timezone", {
    type: "doughnut",
    data: {
      labels: tzLabels,
      datasets: [
        {
          data: tzValues,
          backgroundColor: palette.slice(0, tzLabels.length),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: textColor, font: { size: 11 } } }, tooltip: percentageTooltip },
      cutout: "65%",
    },
  });

  // 11. People: Top Attendees (Meetings Joined)
  const busyMeetLabels = (data.busiest_participants?.by_meetings || []).map((p) => p.name);
  const busyMeetValues = (data.busiest_participants?.by_meetings || []).map((p) => p.count);
  createOrUpdateChart("chart-busiest-meetings", {
    type: "bar",
    data: {
      labels: busyMeetLabels,
      datasets: [
        {
          label: "Meetings Joined",
          data: busyMeetValues,
          backgroundColor: "#8b5cf6",
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
        y: { ticks: { color: textColor }, grid: { display: false } },
      },
    },
  });

  // 12. People: Top Calendars (Busy Slots)
  const busySlotLabels = (data.busiest_participants?.by_busy_slots || []).map((p) => p.name);
  const busySlotValues = (data.busiest_participants?.by_busy_slots || []).map((p) => p.count);
  createOrUpdateChart("chart-busiest-slots", {
    type: "bar",
    data: {
      labels: busySlotLabels,
      datasets: [
        {
          label: "Busy Blocks",
          data: busySlotValues,
          backgroundColor: "#f59e0b",
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
        y: { ticks: { color: textColor }, grid: { display: false } },
      },
    },
  });

  // 13. People: Meetings Organized per User
  const userCreatorLabels = (data.meetings_per_user || []).map((u) => u.name);
  const userCreatorValues = (data.meetings_per_user || []).map((u) => u.count);
  createOrUpdateChart("chart-meetings-per-user", {
    type: "bar",
    data: {
      labels: userCreatorLabels,
      datasets: [
        {
          label: "Meetings Organized",
          data: userCreatorValues,
          backgroundColor: "#06b6d4",
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
        y: { ticks: { color: textColor }, grid: { display: false } },
      },
    },
  });

  // 14. Notifications: Sent vs Pending
  createOrUpdateChart("chart-notif-sent-pending", {
    type: "doughnut",
    data: {
      labels: notifLabels,
      datasets: [
        {
          data: notifValues,
          backgroundColor: ["#10b981", "#f59e0b"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: textColor } }, tooltip: percentageTooltip },
      cutout: "65%",
    },
  });

  // 15. Notifications: Attendee Requirement
  const reqLabels = (data.required_vs_optional || []).map((r) => r.label);
  const reqValues = (data.required_vs_optional || []).map((r) => r.value);
  createOrUpdateChart("chart-attendee-req-opt", {
    type: "doughnut",
    data: {
      labels: reqLabels,
      datasets: [
        {
          data: reqValues,
          backgroundColor: ["#6366f1", "#ec4899"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: textColor } }, tooltip: percentageTooltip },
      cutout: "65%",
    },
  });

  // 16. Notifications: Signups Trend
  createOrUpdateChart("chart-signups-trend", {
    type: "line",
    data: {
      labels: (data.signups_over_time || []).map((s) => s.date.slice(5)),
      datasets: [
        {
          label: "User Signups",
          data: (data.signups_over_time || []).map((s) => s.count),
          borderColor: "#ec4899",
          backgroundColor: "rgba(236, 72, 153, 0.15)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipOptions },
      scales: {
        x: { ticks: { color: textColor, maxTicksLimit: 10 }, grid: { display: false } },
        y: { ticks: { color: textColor, precision: 0 }, grid: { color: gridColor }, beginAtZero: true },
      },
    },
  });
}

function renderUsersTable() {
  const listEl = document.querySelector("#admin-users-list");
  if (!listEl) return;

  const searchInput = document.querySelector("#users-search-input");
  const roleFilter = document.querySelector("#users-role-filter");
  const sortSelect = document.querySelector("#users-sort-select");

  const query = (searchInput?.value || "").trim().toLowerCase();
  const role = roleFilter?.value || "all";
  const sortBy = sortSelect?.value || "newest";

  let filtered = [...adminUsersData];

  if (query) {
    filtered = filtered.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
    );
  }

  if (role !== "all") {
    filtered = filtered.filter((u) => u.role === role);
  }

  filtered.sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "email_asc") return (a.email || "").localeCompare(b.email || "");
    return 0;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center; padding: 24px;">No matching users found.</td></tr>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((u) => {
      const isSelf = u.id === activeUser?.id;
      const nextRole = u.role === "admin" ? "member" : "admin";
      let actionButtons = "";
      if (isSelf) {
        actionButtons = `<span class="muted" style="font-size:12px; font-weight:600;">(Active Admin)</span>`;
      } else {
        actionButtons = `
          <button type="button" class="btn-role-toggle" data-user-id="${u.id}" data-new-role="${nextRole}">Change to ${nextRole}</button>
          <button type="button" class="btn-user-delete" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}" title="Permanently delete user account">🗑 Delete</button>
        `;
      }

      const roleBadge = u.role === "admin"
        ? `<span class="user-role-badge supreme-admin">👑 admin</span>`
        : `<span class="user-role-badge member">member</span>`;

      return `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td>${roleBadge}</td>
          <td>${escapeHtml(localDateTime(u.created_at, { dateOnly: true }))}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
    })
    .join("");

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
        await loadAdminData();
      } catch (err) {
        btn.disabled = false;
        showToast(err.message, "error");
      }
    });
  });
  listEl.querySelectorAll(".btn-user-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;
      const userName = btn.dataset.userName;
      const confirmed = await showConfirmModal(
        `Permanently Delete User?`,
        `Are you sure you want to permanently delete ${userName} from the database? This action cannot be undone.`,
        "Yes, Delete User",
        true
      );
      if (!confirmed) return;

      try {
        btn.disabled = true;
        await api(`/auth/users/${userId}`, { method: "DELETE" });
        showToast(`User ${userName} deleted permanently from database.`, "success");
        await loadAdminData();
      } catch (err) {
        btn.disabled = false;
        showToast(err.message, "error");
      }
    });
  });

}

function exportUsersCSV() {
  if (!adminUsersData || adminUsersData.length === 0) {
    showToast("No user data available to export.", "warning");
    return;
  }
  const headers = ["ID", "Name", "Email", "Role", "Created At"];
  const rows = adminUsersData.map((u) => [
    u.id,
    `"${(u.name || "").replace(/"/g, '""')}"`,
    `"${(u.email || "").replace(/"/g, '""')}"`,
    u.role,
    `"${u.created_at || ""}"`,
  ]);
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `meetwise_users_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Users directory exported to CSV", "success");
}

function exportAnalyticsCSV() {
  if (!adminAnalyticsData) {
    showToast("No analytics data available to export.", "warning");
    return;
  }
  const kpis = adminAnalyticsData.kpis || {};
  const lines = [
    ["Metric", "Value"],
    ["Total Users", kpis.total_users || 0],
    ["Total Participants", kpis.total_participants || 0],
    ["Total Meetings", kpis.total_meetings || 0],
    ["Upcoming Meetings", kpis.upcoming_meetings || 0],
    ["Total Busy Slots", kpis.total_busy_slots || 0],
    ["Pending Notifications", kpis.pending_notifications || 0],
    ["Sent Notifications", kpis.sent_notifications || 0],
    ["Avg Meeting Duration (min)", kpis.avg_meeting_minutes || 0],
    [],
    ["Date", "Meetings Count"],
    ...(adminAnalyticsData.meetings_per_day || []).map((d) => [d.date, d.count]),
    [],
    ["Timezone", "Participant Count"],
    ...(adminAnalyticsData.participants_by_timezone || []).map((t) => [
      t.label,
      t.value,
    ]),
  ];
  const csvContent =
    "data:text/csv;charset=utf-8," + lines.map((r) => r.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `meetwise_analytics_summary_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Analytics summary exported to CSV", "success");
}

async function loadAdminData() {
  const refreshBtn = document.querySelector("#admin-refresh-btn");
  if (refreshBtn) refreshBtn.classList.add("loading");

  try {
    const [analytics, users] = await Promise.all([
      api(`/admin/analytics?days=${adminSelectedDays}`),
      api("/auth/users"),
    ]);

    adminAnalyticsData = analytics;
    adminUsersData = users || [];

    updateKPIValues(adminAnalyticsData.kpis);
    renderAnalyticsCharts(adminAnalyticsData);
    renderUsersTable();

    const lastUpdatedEl = document.querySelector("#admin-last-updated");
    if (lastUpdatedEl) {
      const now = new Date();
      lastUpdatedEl.textContent = `Updated: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    }
  } catch (err) {
    showToast(`Failed to load analytics: ${err.message}`, "error");
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("loading");
  }
}

function setupAdminInteractions() {
  if (adminInitialized) return;
  adminInitialized = true;

  // 1. Tab Navigation
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      document.querySelectorAll(".admin-tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".admin-tab-pane").forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      const targetPane = document.getElementById(`pane-${targetTab}`);
      if (targetPane) targetPane.classList.add("active");

      adminActiveTab = targetTab;

      // Trigger Chart.js resize for newly visible canvases
      setTimeout(() => {
        Object.values(adminCharts).forEach((chart) => {
          try {
            chart.resize();
          } catch {}
        });
      }, 50);
    });
  });

  // 2. Date Range Buttons
  document.querySelectorAll(".date-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const days = parseInt(btn.dataset.days, 10);
      if (days === adminSelectedDays) return;

      document.querySelectorAll(".date-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      adminSelectedDays = days;

      await loadAdminData();
    });
  });

  // 3. Refresh Button
  document.querySelector("#admin-refresh-btn")?.addEventListener("click", async () => {
    await loadAdminData();
    showToast("Analytics refreshed", "info", 2000);
  });

  // 4. Export Buttons
  document.querySelector("#admin-export-analytics-btn")?.addEventListener("click", exportAnalyticsCSV);
  document.querySelector("#admin-export-users-btn")?.addEventListener("click", exportUsersCSV);

  // Supreme Admin: Create User Modal Interactions
  const openCreateUserBtn = document.querySelector("#btn-open-create-user-modal");
  const createUserModal = document.querySelector("#create-user-modal");
  const createUserClose = document.querySelector("#create-user-close");
  const createUserCancel = document.querySelector("#create-user-cancel");
  const createUserForm = document.querySelector("#create-user-form");

  if (openCreateUserBtn && createUserModal) {
    openCreateUserBtn.addEventListener("click", () => {
      createUserModal.classList.remove("hidden");
      document.querySelector("#new-user-name")?.focus();
    });

    const hideCreateUser = () => {
      createUserModal.classList.add("hidden");
      createUserForm?.reset();
    };

    createUserClose?.addEventListener("click", hideCreateUser);
    createUserCancel?.addEventListener("click", hideCreateUser);

    createUserForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.querySelector("#new-user-name").value.trim();
      const email = document.querySelector("#new-user-email").value.trim();
      const password = document.querySelector("#new-user-password").value;
      const role = document.querySelector("#new-user-role").value;

      if (!name || !email || !password) {
        return showToast("Please fill in all user fields.", "warning");
      }
      if (password.length < 8) {
        return showToast("Password must be at least 8 characters long.", "warning");
      }

      const submitBtn = document.querySelector("#create-user-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating User…";

      try {
        const created = await api("/auth/users", {
          method: "POST",
          body: JSON.stringify({ name, email, password, role }),
        });
        showToast(`🎉 User ${created.name} (${created.email}) created permanently in database!`, "success", 4500);
        hideCreateUser();
        await loadAdminData();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create User Permanently";
      }
    });
  }


  // 5. Users Filters
  const searchInput = document.querySelector("#users-search-input");
  const roleFilter = document.querySelector("#users-role-filter");
  const sortSelect = document.querySelector("#users-sort-select");

  if (searchInput) {
    searchInput.addEventListener("input", debounce(renderUsersTable, 200));
  }
  if (roleFilter) {
    roleFilter.addEventListener("change", renderUsersTable);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", renderUsersTable);
  }

  // 6. Theme change observer for automatic chart re-coloring
  const themeObserver = new MutationObserver(() => {
    if (adminAnalyticsData) {
      renderAnalyticsCharts(adminAnalyticsData);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

async function initAdminPanel() {
  const panel = document.querySelector("#admin-panel");
  if (!panel || !activeUser || activeUser.role !== "admin") return;

  panel.style.display = "block";
  setupAdminInteractions();
  await loadAdminData();
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

