# a-amusement Desktop

The official desktop client for [a-amusement!](https://a-amu.uk)

## Features

- Frameless window with a custom titlebar (minimize, maximize, close)
- Loads the live site in an embedded webview
- Titlebar colors follow your Windows light/dark preference
- External links open in your default browser; in-site navigation stays in the app
- **Session persistence** — cookies and site storage are kept between app restarts
- **Login autofill** — saved credentials are encrypted with Windows and filled on `/login.php`
- **System tray** — closing the window hides the app; it keeps running in the tray until you quit
- **Clear data** — titlebar button to wipe saved credentials, cookies, cache, and site storage

Saved login data is stored in your app data folder and encrypted via Electron `safeStorage` (Windows DPAPI). Credentials are saved when you submit the login form and autofilled the next time you visit the login page.

Use **Hide to tray** (the close button) to keep the app running in the background. Right-click the tray icon and choose **Quit** to fully exit.

## Download
Go to the Releases tab to download a prebuilt copy of a-amusement Desktop!

# Want to build it? Here's how!

### Requirements

- Node.js 18+
- Windows 10/11

### Development

```bash
npm install
npm start
```

### Build installer

```bash
npm run dist
```

The packaged app is written to `dist/`.


