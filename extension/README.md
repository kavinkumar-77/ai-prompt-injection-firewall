# Chrome Extension: AI Prompt-Injection & Data-Leak Firewall

A Manifest V3 browser extension that scans web pages for hidden, camouflaged, or indirect prompt injections before untrusted text can reach an AI assistant.

---

## 1. Features
- **CSS Hiding Detection**: Detects elements with `display: none`, `visibility: hidden`, `opacity: 0`, and `font-size: 0px`.
- **Off-Screen Positioning & Clipping**: Flags negative coordinates (e.g. `left: -9999px`) and clipping (`clip: rect(0,0,0,0)`).
- **Color Contrast Camouflage**: Detects white-on-white text or foreground text indistinguishable from its background.
- **HTML Comments**: Flags prompt injection directives embedded inside `<!-- ... -->` comment tags.
- **Unicode Tricks**: Detects zero-width character evasion (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`) and invisible Unicode tag characters (`\uE0000` block).
- **Attribute Injections**: Checks `alt`, `title`, and `aria-label` attributes on 1x1 pixels or hidden containers.
- **Accessibility & UI Awareness**: Skips legitimate `.sr-only` screen-reader text, `<nav>` menus, `<details>` accordions, and common framework comments to maintain low false-positive rates.

---

## 2. Installation & Testing

```bash
# 1. Install dependencies
cd extension
npm install

# 2. Run unit test suite (JSDOM + Vitest)
npm test

# 3. Build production bundle (TypeScript + esbuild)
npm run build
```

---

## 3. Loading the Extension in Google Chrome

1. Open Google Chrome.
2. In the URL address bar, enter `chrome://extensions` and press Enter.
3. In the top-right corner, toggle **Developer mode** to ON.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `extension/` folder from this repository:
   ```text
   C:\finalYearProject\extension
   ```
6. The extension **AI Prompt-Injection and Data-Leak Firewall** will now appear in your extensions list.

---

## 4. Seeing It Work in Chrome

1. Open any web page or test HTML file in Chrome.
2. Press `F12` (or right-click anywhere and select **Inspect**) to open Chrome Developer Tools.
3. Switch to the **Console** tab.
4. You will see the initialization message:
   ```text
   [AI Prompt Firewall] Content script initialized and actively monitoring DOM.
   ```
5. If the page contains hidden injections, the content script logs a warning listing each finding, its CSS selector, severity, and the extracted snippet:
   ```text
   [AI Prompt Firewall] ⚠️ Flagged N hidden or suspicious element(s) on this page: [ ... ]
   ```
6. On clean pages, you will see:
   ```text
   [AI Prompt Firewall] ✅ Page scan complete: No hidden prompt injections detected.
   ```
