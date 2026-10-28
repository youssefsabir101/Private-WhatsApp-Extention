
(() => {
  if (window.__privateWhatsAppInstalled) return;
  window.__privateWhatsAppInstalled = true;

  const LOCK_ID = "pw-lock-screen";

  let enabled = true;
  let locked = false;
  let pinHash = "";
  let pinSalt = "";
  let autoLockMinutes = 0;
  let blurStrength = 6;
  let hideSidebar = false;
  let idleTimer;

  async function digestPin(pin, salt) {
    const data = new TextEncoder().encode(salt + ":" + pin);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function applySettings() {
    if (!document.body) return;

    document.body.classList.toggle("pw-private-on", enabled);
    document.body.classList.toggle("pw-hide-sidebar", hideSidebar);
    document.body.style.setProperty("--pw-blur", `${blurStrength}px`);
    applyLock();
  }

  function removeLockScreen() {
    document.getElementById(LOCK_ID)?.remove();
  }

  function showLockScreen() {
    if (!document.body || document.getElementById(LOCK_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = LOCK_ID;

    const card = document.createElement("div");
    card.className = "pw-card";

    const title = document.createElement("h2");
    title.textContent = "🔒 Private WhatsApp";

    const description = document.createElement("p");
    description.textContent = "Enter your PIN to unlock.";

    const input = document.createElement("input");
    input.type = "password";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.placeholder = "Enter PIN";
    input.setAttribute("aria-label", "Enter PIN");

    const button = document.createElement("button");
    button.textContent = "Unlock";

    const error = document.createElement("p");
    error.className = "pw-error";
    error.setAttribute("role", "status");

    async function unlock() {
      if (!pinHash || !pinSalt) {
        error.textContent = "No PIN configured. Reload the page.";
        return;
      }

      button.disabled = true;

      try {
        const enteredHash = await digestPin(input.value, pinSalt);

        if (enteredHash === pinHash) {
          locked = false;
          await chrome.storage.local.set({ locked: false });
          removeLockScreen();
          resetIdleTimer();
        } else {
          error.textContent = "Incorrect PIN. Try again.";
          input.value = "";
          input.focus();
        }
      } finally {
        button.disabled = false;
      }
    }

    button.addEventListener("click", unlock);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") unlock();
    });

    card.append(title, description, input, button, error);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    input.focus();
  }

  function applyLock() {
    if (locked && pinHash) showLockScreen();
    else removeLockScreen();
  }

  async function reloadSettings() {
    const s = await chrome.storage.local.get({
      enabled: true,
      locked: false,
      pinHash: "",
      pinSalt: "",
      autoLockMinutes: 0,
      blurStrength: 6,
      hideSidebar: false
    });

    enabled = s.enabled;
    locked = s.locked;
    pinHash = s.pinHash;
    pinSalt = s.pinSalt;
    autoLockMinutes = s.autoLockMinutes;
    blurStrength = [4, 6, 8, 12].includes(s.blurStrength)
      ? s.blurStrength : 6;
    hideSidebar = s.hideSidebar;

    applySettings();
    resetIdleTimer();
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);

    if (!autoLockMinutes || !pinHash || locked) return;

    idleTimer = setTimeout(async () => {
      locked = true;
      await chrome.storage.local.set({ locked: true });
      applyLock();
    }, autoLockMinutes * 60 * 1000);
  }

  async function panicLock() {
    const s = await chrome.storage.local.get({
      pinHash: "",
      enabled: true
    });

    if (!s.pinHash) return;

    await chrome.storage.local.set({
      enabled: true,
      locked: true
    });
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
      panicLock();
    }
  }

  function start() {
    reloadSettings();

    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(type => {
      document.addEventListener(type, resetIdleTimer, { passive: true });
    });

    document.addEventListener("keydown", onKeyDown, true);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") reloadSettings();
    });

    // Re-apply the overlay if WhatsApp updates its page.
    new MutationObserver(() => {
      if (locked && pinHash && !document.getElementById(LOCK_ID)) {
        showLockScreen();
      }
    }).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
