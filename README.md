# Private WhatsApp

**Take control of your visual privacy on WhatsApp Web.**

Private WhatsApp is a Chrome extension designed to help you protect sensitive information on your screen while using WhatsApp Web. With customizable visual privacy controls, you can reduce the visibility of private conversations, keep your workspace discreet, and access essential privacy settings directly from the extension.

Simple, lightweight, and designed with privacy in mind.

---

## ✨ Features

- **Visual Privacy Mode** — Blur selected WhatsApp Web content to make sensitive information less visible to people around you.
- **Hover to Reveal** — Temporarily reveal supported conversation details when you need to view them.
- **Adjustable Blur Strength** — Customize the intensity of the visual blur.
- **Sidebar Visibility Control** — Hide the conversation sidebar when you want a cleaner, more private screen.
- **Privacy Lock** — Lock the interface using your configured PIN.
- **Panic Lock Shortcut** — Quickly activate the lock using `Alt + Shift + P`.
- **Automatic Lock** — Configure an inactivity period before the interface locks.
- **Silent Mode** — Enable the available silent-mode privacy behavior.
- **Quick Controls** — Access supported privacy actions from the extension interface.
- **Persistent Settings** — Keep your preferences saved between sessions using Chrome's local extension storage.

*Feature availability and behavior may vary with changes to the WhatsApp Web interface.*

## 🖥️ Screenshots

Screenshots and demonstrations will be added here.

<!-- Replace these placeholders with screenshots before publishing. -->
<!--
![Private WhatsApp — Main Interface](docs/screenshots/main-interface.png)
![Private WhatsApp — Privacy Mode](docs/screenshots/privacy-mode.png)
-->

## 📦 Installation

### Install from the Chrome Web Store

The Chrome Web Store listing will be linked here once the extension is published.

### Install manually for development

1. Clone or download this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extension directory containing `manifest.json`.
6. Open [WhatsApp Web](https://web.whatsapp.com/) and configure the extension from its toolbar popup.

To install updates during development, reload the extension from `chrome://extensions`.

## 🚀 Getting Started

1. Open WhatsApp Web.
2. Click the Private WhatsApp icon in your Chrome toolbar.
3. Enable visual privacy controls.
4. Adjust the available blur and visibility settings to suit your needs.
5. Configure a PIN before using the lock features.
6. Choose the settings that best fit your environment.

**Tip:** Test the extension with a non-sensitive conversation first to understand how the privacy effects behave.

## 🔐 Privacy & Security

Privacy is the core purpose of Private WhatsApp.

- The extension uses Chrome's local extension storage to retain its settings.
- It requests the permissions declared in its manifest, including storage and access to WhatsApp Web.
- A visual blur is a privacy aid, not encryption or a guarantee that information is hidden from every possible viewing method.
- Anyone using your computer may still be able to access your WhatsApp account if your browser session is unlocked.
- Keep your browser, operating system, and WhatsApp account secure.

Before publishing a release, review the extension's source code, permissions, PIN-handling implementation, and Chrome Web Store privacy disclosures.

## 🛠️ Built With

- JavaScript
- HTML
- CSS
- Chrome Extensions API
- Manifest V3

## 🗺️ Roadmap

Potential improvements for future releases:

- [ ] Expand visual privacy controls as WhatsApp Web evolves.
- [ ] Improve accessibility and keyboard navigation.
- [ ] Refine the quick-controls interface.
- [ ] Add more customization options.
- [ ] Publish stable releases through the Chrome Web Store.
- [ ] Expand documentation and troubleshooting guidance.

## ⚠️ Disclaimer

Private WhatsApp is an independent third-party browser extension. It is not affiliated with, endorsed by, or officially connected to WhatsApp or Meta Platforms, Inc.

WhatsApp and its associated trademarks belong to their respective owners. This project modifies the visual presentation of WhatsApp Web and does not replace WhatsApp's own account-security features.

Compatibility may change when WhatsApp Web is updated.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

If you find a problem:

1. Check whether it can be reproduced in the latest version.
2. Open an issue with clear reproduction steps.
3. Include your browser version and relevant screenshots, while avoiding personal or sensitive information.

Please do not publish PINs, private conversations, session information, or other sensitive data in issues or pull requests.

## 📄 License

A license has not yet been specified for this project.

Before making the repository public, add a `LICENSE` file that reflects how you want others to use, modify, and distribute your code. Making a repository public does not, by itself, grant permission to reuse its code.

## 👨‍💻 Author

**Youssef Sabir**

GitHub: [@youssefsabir101](https://github.com/youssefsabir101)

Developed with a focus on practical privacy, simplicity, and a better WhatsApp Web experience.

---

**Private WhatsApp — Your conversations. Your privacy. Your control.**
