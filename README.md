
# Private WhatsApp

**A local-first Chrome extension for visual privacy on WhatsApp Web.**

Private WhatsApp adds configurable visual privacy controls to WhatsApp Web, including adjustable blur, a PIN-based screen overlay, a panic shortcut, sidebar hiding, and an optional in-page notification banner filter.

> **Status:** Personal project / experimental  
> **Platform:** Google Chrome · WhatsApp Web  
> **Manifest:** Chrome Extension Manifest V3

## Features

- **Adjustable blur:** Choose a blur intensity from 1px to 12px.
- **Hover to reveal:** Reveal supported blurred items by moving the pointer over them.
- **Conversation privacy:** Blur supported chat-list entries, messages, media previews, and conversation headers.
- **Groups, Status, Channels and Calls:** Includes experimental selectors for additional WhatsApp Web sections. Coverage depends on the current WhatsApp interface.
- **Hide sidebar:** Hide the conversation list when you want to focus on the open chat.
- **PIN screen overlay:** Cover the WhatsApp Web page and require a PIN to reveal it again.
- **Panic shortcut:** Press `Alt + Shift + P` to activate the lock overlay.
- **Auto-lock:** Optionally lock after a period of inactivity.
- **Silent Mode:** Hide supported in-page notification banners.
- **Local settings:** Preferences are stored with Chrome's local extension storage.

## Installation

This project is intended for local installation. It does not need to be published on the Chrome Web Store.

1. Download or clone this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing `manifest.json`.
6. Open [WhatsApp Web](https://web.whatsapp.com/).
7. Refresh the page and configure the extension from its toolbar popup.

## Configuration

### Blur intensity

Use the slider to select an intensity from 1px to 12px.

### PIN lock

Set a PIN of at least six digits. Use **Lock WhatsApp** to cover the page.

### Panic shortcut

Use:

`Alt + Shift + P`

Keyboard shortcuts may vary with the operating system, browser, or page focus.

### Auto-lock

Choose an inactivity period from the popup. The timer resets when supported user activity is detected.

### Silent Mode

Silent Mode attempts to hide supported notification banners rendered inside WhatsApp Web.

It does **not** guarantee that Chrome notifications, operating-system notifications, incoming calls, or notification sounds are muted. Use your browser, operating-system, or WhatsApp notification settings for those controls.

## Project structure

```text
Private-WhatsApp/
├── manifest.json
├── content.js
├── style.css
├── popup.html
├── popup.js
├── README.md
└── LICENSE
```

## Privacy and security

Private WhatsApp is designed to run locally. The extension code in this repository does not intentionally transmit chat content to an external server.

- Extension preferences are stored using `chrome.storage.local`.
- The extension does not require a remote backend.
- Review the source code before installing or modifying the extension.
- Keep the extension's permissions as limited as practical.

### Important limitations

This is a **visual privacy tool**, not a security boundary.

- The blur effect does not prevent screenshots or screen recording.
- The PIN overlay is not equivalent to locking your computer or encrypting WhatsApp data.
- A SHA-256 hash of a short PIN is not strong protection against offline guessing.
- Someone with access to the browser's developer tools or extension files may bypass the overlay.
- WhatsApp Web changes frequently. Some selectors may stop matching or may need adjustment.
- The extension does not guarantee complete coverage of every chat, group, status, channel, call screen, popup, or notification.

For stronger protection, lock your operating system whenever you leave your computer unattended.

## Troubleshooting

**The blur does not cover an element**

WhatsApp may have changed its interface. Inspect the element using Chrome DevTools and update the relevant selectors in `style.css`.

**Changes do not appear**

Open `chrome://extensions/`, click **Reload** on Private WhatsApp, then refresh WhatsApp Web.

**Silent Mode does not mute sound**

Silent Mode targets supported in-page banners only. Adjust notification and sound settings in WhatsApp, Chrome, or your operating system.

**The sidebar does not disappear**

The sidebar selector may have changed. Check the current WhatsApp DOM before updating the CSS.

## Development

1. Edit the local source files.
2. Reload the extension from `chrome://extensions/`.
3. Refresh WhatsApp Web.
4. Test each feature independently.
5. Check the browser console for errors after WhatsApp updates.

Do not test experimental selectors on sensitive conversations without understanding their effects.

## Roadmap

- More reliable selectors for Status, Channels, Groups and Calls.
- Per-section blur controls.
- More robust keyboard shortcut configuration.
- Improved lock-screen hardening and security documentation.
- Automated checks for extension files and manifest validity.

## Contributing

Bug reports, selector fixes, documentation improvements, and privacy-focused contributions are welcome.

Before submitting a change, describe the WhatsApp Web interface tested and the Chrome version used.

## License

See [LICENSE](LICENSE) for the terms under which this project may be used and distributed.
