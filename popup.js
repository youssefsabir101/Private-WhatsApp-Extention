"use strict";

const $ = id => document.getElementById(id);
const status = $("status");
const pinInput = $("pin");
const nativeStorage = globalThis.chrome?.storage?.local;
const previewSettings = {};

const storage = nativeStorage || {
  async get(defaults) {
    return { ...defaults, ...previewSettings };
  },
  async set(values) {
    Object.assign(previewSettings, values);
  }
};

function say(message, kind = "success") {
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
  requestAnimationFrame(syncPreviewFrameHeight);
}

async function getSettings() {
  return storage.get({
    enabled: true,
    locked: false,
    pinHash: "",
    pinSalt: "",
    autoLockMinutes: 0,
    blurStrength: 6,
    hideSidebar: false,
    silentMode: false
  });
}

async function digestPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function runSafely(action) {
  try {
    await action();
  } catch (error) {
    console.error("[Private WhatsApp] Operation failed:", error);
    say("Something went wrong. Please try again.", "error");
  }
}

function syncRangeProgress(value = $("blurStrength").value) {
  const slider = $("blurStrength");
  const minimum = Number(slider.min);
  const maximum = Number(slider.max);
  const range = Math.max(1, maximum - minimum);
  const ratio = Math.min(1, Math.max(0, (Number(value) - minimum) / range));
  const thumbWidth = 13;
  const sliderWidth = slider.getBoundingClientRect().width;
  const progress = sliderWidth > thumbWidth
    ? (thumbWidth / 2 + ratio * (sliderWidth - thumbWidth)) / sliderWidth * 100
    : ratio * 100;

  slider.style.setProperty("--range-progress", `${progress}%`);
}

function syncPreviewFrameHeight() {
  const frame = window.frameElement;
  const popup = document.querySelector(".popup");

  if (!frame || frame.tagName !== "IFRAME" || !popup) return;

  frame.style.height = `${Math.max(180, Math.ceil(popup.getBoundingClientRect().height))}px`;
}

window.addEventListener("resize", () => {
  syncRangeProgress();
  syncPreviewFrameHeight();
});

async function render() {
  try {
    const settings = await getSettings();
    const enabled = settings.enabled !== false;
    const locked = settings.locked === true;
    const hasPin = Boolean(settings.pinHash && settings.pinSalt);
    const blurStrength = Math.min(12, Math.max(2, Number(settings.blurStrength) || 6));
    const autoLockMinutes = [0, 1, 5, 10].includes(Number(settings.autoLockMinutes))
      ? Number(settings.autoLockMinutes)
      : 0;

    $("blurToggle").checked = enabled;
    $("blurToggle").setAttribute("aria-label", enabled ? "Turn privacy protection off" : "Turn privacy protection on");
    document.body.classList.toggle("is-disabled", !enabled);
    $("disabledState").hidden = enabled;
    $("securityDetails").ontoggle = () => requestAnimationFrame(syncPreviewFrameHeight);
    $("blurStrength").value = String(blurStrength);
    syncRangeProgress(blurStrength);
    $("blurValue").textContent = `${blurStrength}px`;
    $("hideSidebar").checked = settings.hideSidebar === true;
    $("silentMode").checked = settings.silentMode === true;
    $("autoLock").value = String(autoLockMinutes);
    $("autoLock").disabled = !hasPin;

    $("protectionPill").classList.toggle("is-off", !enabled && !locked);
    $("protectionPill").classList.toggle("is-locked", locked);
    $("protectionText").textContent = locked ? "LOCKED" : enabled ? "ACTIVE" : "PAUSED";
    $("protectionLabel").textContent = locked
      ? "WhatsApp is locked"
      : enabled
        ? "Privacy blur is active"
        : "Privacy blur is paused";
    $("protectionPulse").hidden = !enabled || locked;
    $("protectionPulse").closest(".protection-copy").classList.toggle("is-quiet", !enabled || locked);
    $("protectionPulse").closest(".hero-card").classList.toggle("is-off", !enabled || locked);

    $("pinStatus").textContent = hasPin ? "PIN is active" : "PIN not set";
    $("pinStatus").dataset.configured = String(hasPin);
    $("pinSummary").textContent = hasPin
      ? "Your PIN is ready. Auto-lock is available."
      : "Set a PIN for an extra layer of privacy.";
    $("pinLabel").textContent = hasPin ? "Enter your current PIN" : "Create a PIN";
    pinInput.autocomplete = hasPin ? "current-password" : "new-password";
    pinInput.placeholder = hasPin ? "Current PIN" : "At least 6 digits";
    $("savePin").hidden = hasPin;
    $("removePin").hidden = !hasPin;
    $("autoLockHelp").textContent = hasPin
      ? nativeStorage
        ? "Lock WhatsApp after no activity in the current tab."
        : "Auto-lock runs only in the installed extension."
      : "Set a PIN first to enable auto-lock.";
    $("storageLabel").textContent = nativeStorage
      ? "Stored locally in Chrome"
      : "Demo only · resets on refresh";
    requestAnimationFrame(syncPreviewFrameHeight);
  } catch (error) {
    console.error("[Private WhatsApp] Settings render failed:", error);
    say("Unable to load your settings.", "error");
  }
}

$("blurToggle").addEventListener("change", () => runSafely(async () => {
  const enabled = $("blurToggle").checked;
  await storage.set({ enabled });
  await render();

  if (enabled) {
    say(nativeStorage ? "Privacy blur is on." : "Preview: privacy blur is on.");
  } else {
    say("");
  }
}));

$("lockNow").addEventListener("click", () => runSafely(async () => {
  const settings = await getSettings();

  if (!settings.pinHash || !settings.pinSalt) {
    say(nativeStorage ? "Set a PIN before locking WhatsApp." : "Set a PIN to try the lock preview.", "error");
    $("securityDetails").open = true;
    pinInput.focus();
    return;
  }

  await storage.set({ locked: true });
  await render();
  say(nativeStorage ? "WhatsApp is locked." : "Preview is now in the locked state.");
}));

$("panic").addEventListener("click", () => runSafely(async () => {
  const settings = await getSettings();

  if (!settings.pinHash || !settings.pinSalt) {
    say(nativeStorage ? "Set a PIN before using Panic lock." : "Set a PIN to try Panic lock in the preview.", "error");
    $("securityDetails").open = true;
    pinInput.focus();
    return;
  }

  await storage.set({ enabled: true, locked: true });
  await render();
  say(nativeStorage ? "Panic lock activated." : "Preview panic lock activated.");
}));

$("pinForm").addEventListener("submit", event => {
  event.preventDefault();

  void runSafely(async () => {
    const pin = pinInput.value.trim();

    if (!/^\d{6,}$/.test(pin)) {
      say("Use a PIN with at least 6 digits.", "error");
      pinInput.focus();
      return;
    }

    const settings = await getSettings();

    if (settings.pinHash || settings.pinSalt) {
      say("Remove the current PIN before setting a new one.", "error");
      return;
    }

    const salt = makeSalt();
    const pinHash = await digestPin(pin, salt);

    await storage.set({ pinHash, pinSalt: salt });
    pinInput.value = "";
    await render();
    say(nativeStorage ? "PIN saved on this device." : "PIN saved for this preview.");
  });
});

$("removePin").addEventListener("click", () => runSafely(async () => {
  const settings = await getSettings();

  if (!settings.pinHash || !settings.pinSalt) {
    say("There is no PIN to remove.", "error");
    return;
  }

  const pin = pinInput.value.trim();

  if (!/^\d{6,}$/.test(pin)) {
    say("Enter your current PIN to remove it.", "error");
    pinInput.focus();
    return;
  }

  const hash = await digestPin(pin, settings.pinSalt);

  if (hash !== settings.pinHash) {
    say("That PIN is not correct.", "error");
    pinInput.value = "";
    pinInput.focus();
    return;
  }

  await storage.set({
    pinHash: "",
    pinSalt: "",
    locked: false
  });

  pinInput.value = "";
  await render();
  say("PIN removed.");
}));

$("autoLock").addEventListener("change", () => runSafely(async () => {
  const minutes = Number($("autoLock").value);

  if (![0, 1, 5, 10].includes(minutes)) {
    say("Choose a valid auto-lock interval.", "error");
    await render();
    return;
  }

  await storage.set({ autoLockMinutes: minutes });
  say(nativeStorage
    ? minutes ? `Auto-lock set for ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` : "Auto-lock is off."
    : "Preview auto-lock setting updated.");
}));

$("blurStrength").addEventListener("input", () => runSafely(async () => {
  const value = Number($("blurStrength").value);

  if (!Number.isFinite(value) || value < 2 || value > 12) return;

  $("blurValue").textContent = `${value}px`;
  syncRangeProgress(value);
  await storage.set({ blurStrength: value });
}));

$("hideSidebar").addEventListener("change", () => runSafely(async () => {
  const hideSidebar = $("hideSidebar").checked;
  await storage.set({ hideSidebar });
  say(nativeStorage
    ? hideSidebar ? "Sidebar hidden." : "Sidebar visible."
    : hideSidebar ? "Preview: sidebar option enabled." : "Preview: sidebar option disabled.");
}));

$("silentMode").addEventListener("change", () => runSafely(async () => {
  const silentMode = $("silentMode").checked;
  await storage.set({ silentMode });
  say(nativeStorage
    ? silentMode ? "Quiet mode is on." : "Quiet mode is off."
    : silentMode ? "Preview: quiet mode is on." : "Preview: quiet mode is off.");
}));

$("togglePinVisibility").addEventListener("click", () => {
  const isVisible = pinInput.type === "text";
  pinInput.type = isVisible ? "password" : "text";
  $("togglePinVisibility").setAttribute("aria-label", isVisible ? "Show PIN" : "Hide PIN");
  $("togglePinVisibility").title = isVisible ? "Show PIN" : "Hide PIN";
  pinInput.focus();
});

pinInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.isComposing || event.keyCode === 229)) {
    event.preventDefault();
  }
});

void render();
