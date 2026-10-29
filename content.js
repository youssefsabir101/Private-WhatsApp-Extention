(() => {
  "use strict";

  if (window.__privateWhatsAppInstalled) return;
  window.__privateWhatsAppInstalled = true;

  const LOCK_ID = "pw-lock-screen";

  const DEFAULTS = {
    enabled: true,
    locked: false,
    pinHash: "",
    pinSalt: "",
    autoLockMinutes: 0,
    blurStrength: 6,
    hideSidebar: false,
    silentMode: false
  };

  let settings = { ...DEFAULTS };
  let idleTimer = null;
  let observer = null;
  let started = false;
  let reloadInProgress = false;
  let reloadQueued = false;
  let unlockInProgress = false;

  async function digestPin(pin, salt) {
    const data = new TextEncoder().encode(`${salt}:${pin}`);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function removeLockScreen() {
    document.getElementById(LOCK_ID)?.remove();
  }

  function applySettings() {
    if (!document.body) return;

    const {
      enabled,
      locked,
      pinHash,
      blurStrength,
      hideSidebar,
      silentMode
    } = settings;

    document.body.classList.toggle("pw-private-on", enabled);
    document.body.classList.toggle("pw-hide-sidebar", hideSidebar);
    document.body.classList.toggle("pw-silent-mode", silentMode);

    const strength = Math.min(
      12,
      Math.max(2, Number(blurStrength) || DEFAULTS.blurStrength)
    );

    document.body.style.setProperty("--pw-blur", `${strength}px`);

    if (locked && pinHash) {
      showLockScreen();
    } else {
      removeLockScreen();
    }
    updatePrivacyIsland();
  }

  function showLockScreen() {
    if (!document.body || document.getElementById(LOCK_ID)) return;
    if (!settings.locked || !settings.pinHash) return;

    const overlay = document.createElement("div");
    overlay.id = LOCK_ID;
    overlay.className = "pw-lock-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "pw-lock-title");

    const card = document.createElement("section");
    card.className = "pw-card";

    const icon = document.createElement("div");
    icon.className = "pw-lock-icon";
    icon.setAttribute("aria-hidden", "true");

    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("viewBox", "0 0 24 24");
    iconSvg.setAttribute("fill", "none");
    iconSvg.setAttribute("focusable", "false");

    const shieldPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shieldPath.setAttribute("d", "M12 3.2 19 6v5.1c0 4.5-2.8 7.6-7 9.7-4.2-2.1-7-5.2-7-9.7V6l7-2.8Z");

    const checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    checkPath.setAttribute("d", "m9 11.8 2 2 4-4");

    iconSvg.append(shieldPath, checkPath);
    icon.appendChild(iconSvg);


    const title = document.createElement("h2");
    title.id = "pw-lock-title";
    title.textContent = "Private WhatsApp";

    const description = document.createElement("p");
    description.className = "pw-lock-description";
    description.textContent = "Enter your PIN to unlock WhatsApp.";

    const form = document.createElement("form");
    form.className = "pw-lock-form";

    const input = document.createElement("input");
    input.className = "pw-lock-input";
    input.type = "password";
    input.inputMode = "numeric";
    input.pattern = "[0-9]*";
    input.autocomplete = "off";
    input.placeholder = "Enter your PIN";
    input.setAttribute("aria-label", "Enter your PIN");
    input.setAttribute("aria-describedby", "pw-lock-error");
    input.required = true;
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.isComposing || event.keyCode === 229)) {
        event.preventDefault();
      }
    });

    const button = document.createElement("button");
    button.className = "pw-lock-button";
    button.type = "submit";
    button.textContent = "Unlock WhatsApp";

    const error = document.createElement("p");
    error.id = "pw-lock-error";
    error.className = "pw-error";
    error.setAttribute("role", "status");
    error.setAttribute("aria-live", "polite");

    form.append(input, button);
    card.append(icon, title, description, form, error);
    overlay.appendChild(card);

    // Keep interaction inside the lock overlay.
    const blockOutsideInteraction = event => {
      if (event.target === overlay) {
        event.preventDefault();
      }
    };

    ["pointerdown", "click", "contextmenu"].forEach(type => {
      overlay.addEventListener(type, blockOutsideInteraction);
    });

    // Avoid accidental keyboard interaction with WhatsApp behind the lock.
    overlay.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        input.focus();
      }
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (unlockInProgress) return;

      const pin = input.value;

      if (!/^\d{6,}$/.test(pin)) {
        error.textContent = "Enter a PIN with at least 6 digits.";
        input.focus();
        return;
      }

      if (!settings.pinHash || !settings.pinSalt) {
        error.textContent = "PIN is not configured correctly.";
        return;
      }

      unlockInProgress = true;
      button.disabled = true;
      input.disabled = true;
      error.textContent = "";

      try {
        const hash = await digestPin(pin, settings.pinSalt);

        if (hash !== settings.pinHash) {
          error.textContent = "Incorrect PIN. Try again.";
          input.value = "";
          input.disabled = false;
          input.focus();
          return;
        }

        // Persist the unlocked state before removing the overlay.
        await chrome.storage.local.set({ locked: false });

        settings.locked = false;
        removeLockScreen();
        resetIdleTimer();
      } catch (err) {
        console.error("[Private WhatsApp] Unlock failed:", err);
        error.textContent = "Unable to unlock. Please try again.";
        input.disabled = false;
        input.focus();
      } finally {
        unlockInProgress = false;
        button.disabled = false;
      }
    });

    document.body.appendChild(overlay);

    // Focus after insertion so the input is available to the browser.
    input.focus();
  }

  function applyLock() {
    if (settings.locked && settings.pinHash && settings.pinSalt) {
      showLockScreen();
    } else {
      removeLockScreen();
    }
  }
  
  // ==========================================
  // PRIVATE WHATSAPP — DYNAMIC ISLAND
  // ==========================================

  function createPrivacyIsland() {
    if (!document.body || document.getElementById("pw-dynamic-island")) {
      return;
    }

    const island = document.createElement("div");
    island.id = "pw-dynamic-island";
    island.setAttribute("aria-label", "Private WhatsApp quick controls");

    island.innerHTML = `
      <span class="pw-island-brand" title="Drag to move">
        <svg class="pw-island-logo" viewBox="0 0 24 24"
          fill="none" aria-hidden="true">
          <path d="M12 3.2 19 6v5.1c0 4.5-2.8 7.6-7 9.7-4.2-2.1-7-5.2-7-9.7V6l7-2.8Z"/>
          <path d="m9 11.8 2 2 4-4"/>
        </svg>
        <span>PRIVATE <b>WA</b></span>
      </span>

      <span class="pw-island-divider"></span>

      <label class="pw-island-switch" title="Enable or disable Blur">
        <input id="pw-island-toggle" type="checkbox"
          role="switch" aria-label="Enable privacy blur">
        <span class="pw-island-slider"></span>
      </label>

      <button class="pw-island-action" id="pw-island-lock"
        type="button" title="Lock WhatsApp" aria-label="Lock WhatsApp">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="5" y="10" width="14" height="11" rx="2"/>
          <path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/>
        </svg>
      </button>

      <button class="pw-island-action pw-island-panic"
        id="pw-island-panic" type="button"
        title="Panic lock" aria-label="Activate panic lock">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3 20 7v5c0 4.2-3.1 7.2-8 9-4.9-1.8-8-4.8-8-9V7l8-4Z"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </button>

      <span id="pw-island-status" class="pw-island-status"
        role="status" aria-live="polite"></span>
    `;

    document.body.appendChild(island);

    const toggle = island.querySelector("#pw-island-toggle");
    const lockButton = island.querySelector("#pw-island-lock");
    const panicButton = island.querySelector("#pw-island-panic");

    // Restore the last position, if one was saved.
    chrome.storage.local.get({ pwIslandPosition: null })
      .then(({ pwIslandPosition }) => {
        if (
          pwIslandPosition &&
          Number.isFinite(pwIslandPosition.x) &&
          Number.isFinite(pwIslandPosition.y) &&
          !island.classList.contains("pw-island-dragging")
        ) {
          setIslandPosition(pwIslandPosition.x, pwIslandPosition.y);
        }
      })
      .catch(error => {
        console.warn("[Private WhatsApp] Could not restore island position:", error);
      });

    function setIslandPosition(x, y) {
      const maxX = Math.max(0, window.innerWidth - island.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - island.offsetHeight);

      island.style.setProperty(
        "left",
        `${Math.max(0, Math.min(maxX, x))}px`,
        "important"
      );
      island.style.setProperty(
        "top",
        `${Math.max(0, Math.min(maxY, y))}px`,
        "important"
      );
      island.style.setProperty("right", "auto", "important");
      island.style.setProperty("bottom", "auto", "important");
      island.style.setProperty("transform", "none", "important");
    }

    // Drag from the island's empty space or brand.
    // Interactive controls remain clickable.
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    island.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      if (event.target.closest("button, input, label")) return;

      const rect = island.getBoundingClientRect();

      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = rect.left;
      originY = rect.top;

      setIslandPosition(rect.left, rect.top);
      island.classList.add("pw-island-dragging");

      try {
        island.setPointerCapture(event.pointerId);
      } catch (_) {}

      event.preventDefault();
    });

    island.addEventListener("pointermove", event => {
      if (!dragging) return;

      setIslandPosition(
        originX + event.clientX - startX,
        originY + event.clientY - startY
      );
    });

    function stopDragging() {
      if (!dragging) return;

      dragging = false;
      island.classList.remove("pw-island-dragging");

      const rect = island.getBoundingClientRect();

      chrome.storage.local.set({
        pwIslandPosition: { x: rect.left, y: rect.top }
      }).catch(error => {
        console.warn("[Private WhatsApp] Could not save island position:", error);
      });
    }

    island.addEventListener("pointerup", stopDragging);
    island.addEventListener("pointercancel", stopDragging);
    island.addEventListener("lostpointercapture", stopDragging);

    window.addEventListener("resize", () => {
      const rect = island.getBoundingClientRect();
      setIslandPosition(rect.left, rect.top);
    });

    // Blur ON/OFF — shares the same setting as the popup.
    toggle.addEventListener("change", async () => {
      const previous = settings.enabled;
      const next = toggle.checked;

      toggle.disabled = true;
      settings.enabled = next;
      applySettings();

      try {
        await chrome.storage.local.set({ enabled: next });
      } catch (error) {
        settings.enabled = previous;
        applySettings();
        showIslandMessage("Could not update Blur");
        console.error("[Private WhatsApp] Island toggle failed:", error);
      } finally {
        toggle.disabled = false;
      }
    });

    // Lock now — same behaviour as the popup's Lock now button.
    lockButton.addEventListener("click", async () => {
      if (!settings.pinHash || !settings.pinSalt) {
        showIslandMessage("Set a PIN in the popup first");
        return;
      }

      try {
        settings.locked = true;
        applySettings();
        resetIdleTimer();

        await chrome.storage.local.set({ locked: true });
      } catch (error) {
        await reloadSettings();
        showIslandMessage("Could not lock WhatsApp");
        console.error("[Private WhatsApp] Island lock failed:", error);
      }
    });

    // Panic — enables Blur and locks WhatsApp.
    panicButton.addEventListener("click", async () => {
      if (!settings.pinHash || !settings.pinSalt) {
        showIslandMessage("Set a PIN in the popup first");
        return;
      }

      const previousEnabled = settings.enabled;
      const previousLocked = settings.locked;

      settings.enabled = true;
      settings.locked = true;
      applySettings();
      resetIdleTimer();

      try {
        await chrome.storage.local.set({
          enabled: true,
          locked: true
        });
      } catch (error) {
        settings.enabled = previousEnabled;
        settings.locked = previousLocked;
        applySettings();
        showIslandMessage("Panic lock failed");
        console.error("[Private WhatsApp] Island panic failed:", error);
      }
    });

    updatePrivacyIsland();
  }

  function showIslandMessage(message) {
    const status = document.querySelector("#pw-island-status");
    if (!status) return;

    status.textContent = message;

    setTimeout(() => {
      updatePrivacyIsland();
    }, 2200);
  }

  function updatePrivacyIsland() {
    const island = document.getElementById("pw-dynamic-island");
    if (!island) return;

    const toggle = island.querySelector("#pw-island-toggle");
    const status = island.querySelector("#pw-island-status");

    toggle.checked = settings.enabled;
    island.classList.toggle("pw-island-off", !settings.enabled);
    island.classList.toggle("pw-island-locked", settings.locked);

    toggle.setAttribute(
      "aria-label",
      settings.enabled ? "Disable privacy blur" : "Enable privacy blur"
    );

    if (status) {
      status.textContent = settings.locked
        ? "LOCKED"
        : settings.enabled
          ? "PROTECTED"
          : "PAUSED";
    }
  }

  async function reloadSettings() {
    if (reloadInProgress) {
      reloadQueued = true;
      return;
    }

    reloadInProgress = true;

    try {
      do {
        reloadQueued = false;

        const stored = await chrome.storage.local.get(DEFAULTS);

        settings = {
          ...DEFAULTS,
          ...stored,
          enabled: stored.enabled !== false,
          locked: stored.locked === true,
          pinHash: typeof stored.pinHash === "string"
            ? stored.pinHash
            : "",
          pinSalt: typeof stored.pinSalt === "string"
            ? stored.pinSalt
            : "",
          autoLockMinutes: [0, 1, 5, 10].includes(
            Number(stored.autoLockMinutes)
          ) ? Number(stored.autoLockMinutes) : 0,
          blurStrength: Math.min(
            12,
            Math.max(2, Number(stored.blurStrength) || 6)
          ),
          hideSidebar: stored.hideSidebar === true,
          silentMode: stored.silentMode === true
        };

        // Do not retain an unusable lock without valid PIN data.
        if (!settings.pinHash || !settings.pinSalt) {
          settings.locked = false;
        }

        applySettings();
        resetIdleTimer();
      } while (reloadQueued);
    } catch (err) {
      console.error("[Private WhatsApp] Settings reload failed:", err);
    } finally {
      reloadInProgress = false;
    }
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = null;

    if (
      !settings.autoLockMinutes ||
      !settings.pinHash ||
      !settings.pinSalt ||
      settings.locked
    ) {
      return;
    }

    idleTimer = setTimeout(async () => {
      if (settings.locked || !settings.pinHash || !settings.pinSalt) {
        return;
      }

      try {
        await chrome.storage.local.set({ locked: true });
        settings.locked = true;
        applyLock();
      } catch (err) {
        console.error("[Private WhatsApp] Auto-lock failed:", err);
      }
    }, settings.autoLockMinutes * 60 * 1000);
  }

  async function panicLock() {
    try {
      const stored = await chrome.storage.local.get({
        pinHash: "",
        pinSalt: ""
      });

      if (!stored.pinHash || !stored.pinSalt) return;

      // Update local state immediately for a faster visual response.
      settings.enabled = true;
      settings.locked = true;
      applySettings();

      await chrome.storage.local.set({
        enabled: true,
        locked: true
      });
    } catch (err) {
      console.error("[Private WhatsApp] Panic lock failed:", err);
    }
  }

  function onKeyDown(event) {
    if (
      event.altKey &&
      event.shiftKey &&
      event.code === "KeyP" &&
      !event.repeat
    ) {
      event.preventDefault();
      event.stopPropagation();
      void panicLock();
    }
  }

  function start() {
    if (started || !document.body) return;
    started = true;

    createPrivacyIsland();
    void reloadSettings();

    [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart"
    ].forEach(type => {
      document.addEventListener(type, resetIdleTimer, { passive: true });
    });

    document.addEventListener("keydown", onKeyDown, true);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;

      // Only reload for settings managed by this extension.
      if (Object.keys(changes).some(key => key in DEFAULTS)) {
        void reloadSettings();
      }
    });

    observer = new MutationObserver(() => {
      if (
        settings.locked &&
        settings.pinHash &&
        settings.pinSalt &&
        !document.getElementById(LOCK_ID)
      ) {
        showLockScreen();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
