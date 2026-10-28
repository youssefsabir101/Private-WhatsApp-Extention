const $ = id => document.getElementById(id);
const status = $("status");

async function getSettings() {
  return chrome.storage.local.get({
    enabled: true,
    locked: false,
    pinHash: "",
    pinSalt: "",
    autoLockMinutes: 0
  });
}

function say(message) {
  status.textContent = message;
}

async function digestPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ":" + pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function render() {
  const s = await getSettings();
  $("blurToggle").textContent = s.enabled
    ? "Blur: ON — click to turn OFF"
    : "Blur: OFF — click to turn ON";
  $("autoLock").value = String(s.autoLockMinutes);
}

$("blurToggle").addEventListener("click", async () => {
  const s = await getSettings();
  await chrome.storage.local.set({ enabled: !s.enabled });
  await render();
});

$("lockNow").addEventListener("click", async () => {
  const s = await getSettings();

  if (!s.pinHash) {
    say("Set a PIN first.");
    return;
  }

  await chrome.storage.local.set({ locked: true });
  say("WhatsApp locked.");
});

$("panic").addEventListener("click", async () => {
  const s = await getSettings();

  if (!s.pinHash) {
    say("Set a PIN first to use Panic Button.");
    return;
  }

  await chrome.storage.local.set({
    enabled: true,
    locked: true
  });
  say("Panic mode activated.");
});

$("savePin").addEventListener("click", async () => {
  const pin = $("pin").value.trim();

  if (!/^\d{6,}$/.test(pin)) {
    say("Use a PIN with at least 6 digits.");
    return;
  }

  const salt = Array.from(
    crypto.getRandomValues(new Uint8Array(16))
  ).map(b => b.toString(16).padStart(2, "0")).join("");

  const pinHash = await digestPin(pin, salt);

  await chrome.storage.local.set({
    pinHash,
    pinSalt: salt
  });

  $("pin").value = "";
  say("PIN saved. Keep your computer locked when away.");
});


$("removePin").addEventListener("click", async () => {
  const s = await getSettings();

  if (!s.pinHash) {
    say("No PIN is currently set.");
    return;
  }

  const pin = $("pin").value.trim();

  if (!pin) {
    say("Enter your current PIN in the PIN field first.");
    return;
  }

  const enteredHash = await digestPin(pin, s.pinSalt);

  if (enteredHash !== s.pinHash) {
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
});


$("autoLock").addEventListener("change", async () => {
  await chrome.storage.local.set({
    autoLockMinutes: Number($("autoLock").value)
  });
  say("Auto-lock setting saved.");
});

render();
