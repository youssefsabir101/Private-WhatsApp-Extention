
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
  status.textContent = message;
}

async function digestPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ":" + pin);
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

async function render() {
  const s = await getSettings();

  $("blurToggle").textContent = s.enabled
    ? "Blur: ON — click to turn OFF"
    : "Blur: OFF — click to turn ON";

  $("autoLock").value = String(s.autoLockMinutes);
  $("blurStrength").value = String(s.blurStrength);
  $("blurValue").textContent = `${s.blurStrength}px`;
  $("hideSidebar").checked = s.hideSidebar;
  $("silentMode").checked = s.silentMode;
}

$("blurToggle").addEventListener("click", async () => {
  const s = await getSettings();
  await chrome.storage.local.set({ enabled: !s.enabled });
  await render();
  say("Blur setting updated.");
});

$("lockNow").addEventListener("click", async () => {
  const s = await getSettings();
  if (!s.pinHash) return say("Set a PIN first.");

  await chrome.storage.local.set({ locked: true });
  say("Lock requested.");
});

$("panic").addEventListener("click", async () => {
  const s = await getSettings();
  if (!s.pinHash) return say("Set a PIN first.");

  await chrome.storage.local.set({
    enabled: true,
    locked: true
  });
  say("Panic mode activated.");
});

$("savePin").addEventListener("click", async () => {
  const pin = $("pin").value.trim();

  if (!/^\d{6,}$/.test(pin)) {
    return say("Use a PIN with at least 6 digits.");
  }

  const s = await getSettings();
  if (s.pinHash) {
    return say("Remove the existing PIN before setting a new one.");
  }

  const salt = makeSalt();
  const pinHash = await digestPin(pin, salt);
  await chrome.storage.local.set({ pinHash, pinSalt: salt });

  $("pin").value = "";
  say("PIN saved.");
});

$("removePin").addEventListener("click", async () => {
  const s = await getSettings();
  if (!s.pinHash) return say("No PIN is set.");

  const pin = $("pin").value.trim();
  if (!pin) return say("Enter your current PIN first.");

  const hash = await digestPin(pin, s.pinSalt);
  if (hash !== s.pinHash) return say("Incorrect PIN.");

  await chrome.storage.local.set({
    pinHash: "",
    pinSalt: "",
    locked: false
  });

  $("pin").value = "";
  say("PIN removed.");
});

$("autoLock").addEventListener("change", async () => {
  await chrome.storage.local.set({
    autoLockMinutes: Number($("autoLock").value)
  });
  say("Auto-lock setting saved.");
});

$("blurStrength").addEventListener("input", async () => {
  const value = Number($("blurStrength").value);
  $("blurValue").textContent = `${value}px`;
  await chrome.storage.local.set({ blurStrength: value });
});

$("hideSidebar").addEventListener("change", async () => {
  await chrome.storage.local.set({
    hideSidebar: $("hideSidebar").checked
  });
  say("Sidebar setting updated.");
});

$("silentMode").addEventListener("change", async () => {
  await chrome.storage.local.set({
    silentMode: $("silentMode").checked
  });
  say("Silent Mode setting updated.");
});

render();
