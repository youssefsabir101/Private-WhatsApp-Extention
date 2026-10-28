(() => {
  if (window.__privateWhatsAppInstalled) return;
  window.__privateWhatsAppInstalled = true;

  const STYLE_ID = "private-whatsapp-runtime";
  const LOCK_ID = "pw-lock-screen";

  let enabled = true;
  let locked = false;
  let pinHash = "";
  let pinSalt = "";
  let autoLockMinutes = 0;
  let idleTimer;

  const blurSelectors = [
    '#pane-side [role="listitem"]',
    '#pane-side [role="row"]',
    '#pane-side [data-testid="cell-frame-container"]',
    '#pane-side [data-testid="list-item"]',
    '[data-testid="cell-frame-container"]',
    '[data-testid="msg-container"]',
    '[data-testid="conversation-info-header"]',
    '[data-testid="image-thumb"]',
    '[data-testid="media-url-provider"]',
    '[data-testid="quoted-message"]',
    '[data-testid="link-preview"]'
  ];

  function addStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.documentElement.appendChild(style);
    }

    const blurRules = blurSelectors.map(selector => `
      body.pw-private-on ${selector} {
        filter: blur(6px) !important;
        transition: filter 120ms ease !important;
      }
      body.pw-private-on ${selector}:hover {
        filter: none !important;
      }
    `).join("\n");

    style.textContent = `
      ${blurRules}

      #${LOCK_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #101b22 !important;
        color: #f1f5f6 !important;
        font: 16px Arial, sans-serif !important;
      }

      #${LOCK_ID} * { box-sizing: border-box; }

      #${LOCK_ID} .pw-card {
        width: min(340px, 90vw);
        padding: 26px;
        border-radius: 16px;
        background: #1b2a32;
        text-align: center;
        box-shadow: 0 10px 40px #0008;
      }

      #${LOCK_ID} input,
      #${LOCK_ID} button {
        width: 100%;
        padding: 12px;
        margin-top: 12px;
        border-radius: 8px;
        font-size: 15px;
      }

      #${LOCK_ID} input {
        color: #fff;
        background: #101b22;
        border: 1px solid #52616b;
      }

      #${LOCK_ID} button {
        border: 0;
        background: #00a884;
        color: white;
        cursor: pointer;
      }

      #${LOCK_ID} .pw-error {
        color: #ff9999;
        min-height: 20px;
      }
    `;
  }

  function applyBlur() {
    document.body?.classList.toggle("pw-private-on", enabled);
  }

  async function digestPin(pin, salt) {
    const data = new TextEncoder().encode(salt + ":" + pin);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
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
      const pin = input.value;
      if (!pin || !pinHash || !pinSalt) {
        error.textContent = "PIN is not configured.";
        return;
      }

      button.disabled = true;
      try {
        const enteredHash = await digestPin(pin, pinSalt);

        if (enteredHash === pinHash) {
          locked = false;
          await chrome.storage.local.set({ locked: false });
          removeLockScreen();
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
    const settings = await chrome.storage.local.get({
      enabled: true,
      locked: false,
      pinHash: "",
      pinSalt: "",
      autoLockMinutes: 0
    });

    enabled = settings.enabled;
    locked = settings.locked;
    pinHash = settings.pinHash;
    pinSalt = settings.pinSalt;
    autoLockMinutes = settings.autoLockMinutes;

    applyBlur();
    applyLock();
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

  function start() {
    addStyle();

    ["mousemove", "keydown", "click", "scroll", "touchstart"]
      .forEach(eventName => {
        document.addEventListener(eventName, resetIdleTimer, {
          passive: true
        });
      });

    reloadSettings();

    new MutationObserver(() => {
      addStyle();
      applyBlur();
      applyLock();
    }).observe(document.body, {
      childList: true,
      subtree: true
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") reloadSettings();
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
