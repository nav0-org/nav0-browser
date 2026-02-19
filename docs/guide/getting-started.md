---
title: "Getting Started with nav0 Browser — Installation & Setup"
description: "Download and install nav0 browser for Windows, macOS, or Linux. Learn keyboard shortcuts, configuration, and basic usage of the privacy-focused browser."
---

# Getting Started

nav0 is a minimal web browser built on Electron that prioritizes your privacy and system resources.

## Installation

### macOS (Homebrew)

The recommended way to install nav0 on macOS is via [Homebrew](https://brew.sh):

```bash
brew install --cask nav0-org/nav0/nav0-browser
```

To update:

```bash
brew upgrade --cask nav0-browser
```

### Windows

Download the `.exe` installer from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases).

### Linux

Download `.deb` (Debian/Ubuntu) or `.rpm` (Fedora/RHEL) packages from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases).

### Build from Source

On any platform, you can also build nav0 from source:

```bash
# Clone the repository
git clone https://github.com/nav0-org/nav0-browser.git
cd nav0-browser

# Install dependencies
npm install

# Build the app
npm run make
```

The built app will be in the `out/` directory. Requires [Node.js](https://nodejs.org) 22+ and npm.

## First Launch

When you first open nav0, you'll notice something different: **nothing asks for your data**.

- No account creation prompts
- No "personalization" setup
- No telemetry consent dialogs

Just a browser, ready to use.

## Basic Usage

### Navigation

- **Address Bar**: Type URLs or search terms
- **Back/Forward**: Navigate your history
- **Refresh**: Reload the current page
- **Home**: Return to your start page

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Tab | `Ctrl+T` | `Cmd+T` |
| Close Tab | `Ctrl+W` | `Cmd+W` |
| Reload | `Ctrl+R` | `Cmd+R` |
| Address Bar | `Ctrl+L` | `Cmd+L` |
| Find in Page | `Ctrl+F` | `Cmd+F` |
| Developer Tools | `F12` | `Cmd+Option+I` |

## Configuration

nav0 stores its configuration locally on your machine. No cloud sync, no account needed.

Configuration location:
- **Windows**: `%APPDATA%/nav0/`
- **macOS**: `~/Library/Application Support/nav0/`
- **Linux**: `~/.config/nav0/`

## What's Not Included

By design, nav0 does **not** include:

- User accounts or sign-in
- Sync services
- AI assistants or chatbots
- News feeds or content recommendations
- Cryptocurrency wallets
- Built-in VPN upsells
- Telemetry or analytics

If you need these features, nav0 isn't for you—and that's okay. We built nav0 for users who want less, not more.

## Next Steps

- Learn about nav0's [Features](/guide/features)
- Understand our [Privacy](/guide/privacy) commitment
- Read about our [Philosophy](/guide/philosophy)
