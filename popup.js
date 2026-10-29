
"use strict";

const $ = id => document.getElementById(id);
const status = $("status");

async function getSettings() {
  return chrome.storage.local.get({
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

function say(message) {
  if (status) status.textContent = message;
}

async function digestPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function runSafely(action, successMessage) {
  try {
    await action();
    if (successMessage) say(successMessage);
  } catch (error) {
    console.error("[Private WhatsApp] Operation failed:", error);
    say("Operation failed. Please try again.");
  }
}

async function render() {
  try {
    const s = await getSettings();

    $("blurToggle").textContent = s.enabled
      ? "Blur: ON — click to turn OFF"
      : "Blur: OFF — click to turn ON";

    $("autoLock").value = String(s.autoLockMinutes);
    $("blurStrength").value = String(s.blurStrength);
    $("blurValue").textContent = `${s.blurStrength}px`;
    $("hideSidebar").checked = s.hideSidebar;
    $("silentMode").checked = s.silentMode;
  } catch (error) {
    console.error("[Private WhatsApp] Render failed:", error);
    say("Unable to load settings.");
  }
}

$("blurToggle").addEventListener("click", () => runSafely(async () => {
  const s = await getSettings();
  await chrome.storage.local.set({ enabled: !s.enabled });
  await render();
}, "Blur setting updated."));

$("lockNow").addEventListener("click", () => runSafely(async () => {
  const s = await getSettings();

  if (!s.pinHash || !s.pinSalt) {
    say("Set a valid PIN first.");
    return;
  }

  await chrome.storage.local.set({ locked: true });
  say("Lock requested.");
}));

$("panic").addEventListener("click", () => runSafely(async () => {
  const s = await getSettings();

  if (!s.pinHash || !s.pinSalt) {
    say("Set a valid PIN first.");
    return;
  }

  await chrome.storage.local.set({
    enabled: true,
    locked: true
  });

  say("Panic mode activated.");
}));

$("savePin").addEventListener("click", () => runSafely(async () => {
  const pin = $("pin").value.trim();

  if (!/^\d{6,}$/.test(pin)) {
    say("Use a PIN with at least 6 digits.");
    return;
  }

  const s = await getSettings();

  if (s.pinHash || s.pinSalt) {
    say("Remove the existing PIN before setting a new one.");
    return;
  }

  const salt = makeSalt();
  const pinHash = await digestPin(pin, salt);

  await chrome.storage.local.set({
    pinHash,
    pinSalt: salt
  });

  $("pin").value = "";
  say("PIN saved.");
}));

$("removePin").addEventListener("click", () => runSafely(async () => {
  const s = await getSettings();

  if (!s.pinHash || !s.pinSalt) {
    say("No valid PIN is set.");
    return;
  }

  const pin = $("pin").value.trim();

  if (!/^\d{6,}$/.test(pin)) {
    say("Enter your current PIN.");
    return;
  }

  const hash = await digestPin(pin, s.pinSalt);

  if (hash !== s.pinHash) {
    say("Incorrect PIN.");
    return;
  }

  await chrome.storage.local.set({
    pinHash: "",
    pinSalt: "",
    locked: false
  });

  $("pin").value = "";
  say("PIN removed.");
}));

$("autoLock").addEventListener("change", () => runSafely(async () => {
  const value = Number($("autoLock").value);

  if (![0, 1, 5, 10].includes(value)) {
    say("Invalid auto-lock value.");
    await render();
    return;
  }

  await chrome.storage.local.set({ autoLockMinutes: value });
}, "Auto-lock setting saved."));

$("blurStrength").addEventListener("input", () => runSafely(async () => {
  const value = Number($("blurStrength").value);

  if (!Number.isFinite(value) || value < 2 || value > 12) return;

  $("blurValue").textContent = `${value}px`;
  await chrome.storage.local.set({ blurStrength: value });
}));

$("hideSidebar").addEventListener("change", () => runSafely(async () => {
  await chrome.storage.local.set({
    hideSidebar: $("hideSidebar").checked
  });
}, "Sidebar setting updated."));

$("silentMode").addEventListener("change", () => runSafely(async () => {
  await chrome.storage.local.set({
    silentMode: $("silentMode").checked
  });
}, "Silent Mode setting updated."));

void render();
