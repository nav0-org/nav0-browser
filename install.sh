#!/bin/bash
set -euo pipefail

REPO="nav0-org/nav0-browser"
APP_NAME="nav0-browser"
INSTALL_DIR="/Applications"

echo "Installing nav0 browser..."

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  arm64) ARCH_SUFFIX="arm64" ;;
  x86_64) ARCH_SUFFIX="x64" ;;
  *)
    echo "Error: Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Check if nav0 is currently running and quit it before installing
if pgrep -f "$APP_NAME" >/dev/null 2>&1; then
  echo "Nav0 is currently running. Quitting before upgrade..."
  osascript -e "tell application \"$APP_NAME\" to quit" 2>/dev/null || true
  # Wait for the process to exit (up to 5 seconds)
  for i in $(seq 1 10); do
    if ! pgrep -f "$APP_NAME" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  # Force kill if still running
  if pgrep -f "$APP_NAME" >/dev/null 2>&1; then
    echo "Force-closing nav0..."
    pkill -f "$APP_NAME" 2>/dev/null || true
    sleep 1
  fi
fi

# Get latest release tag
echo "Fetching latest release..."
TAG=$(curl -sfL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)

if [ -z "$TAG" ]; then
  echo "Error: Could not determine latest release"
  exit 1
fi

VERSION="${TAG#v}"
DMG_NAME="${APP_NAME}-${VERSION}-${ARCH_SUFFIX}.dmg"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$DMG_NAME"

TMPDIR_INSTALL=$(mktemp -d)
trap 'rm -rf "$TMPDIR_INSTALL"' EXIT

# Download DMG
echo "Downloading $DMG_NAME..."
if ! curl -#fL "$DOWNLOAD_URL" -o "$TMPDIR_INSTALL/$DMG_NAME"; then
  echo "Error: Failed to download $DOWNLOAD_URL"
  exit 1
fi

# Mount DMG
echo "Installing..."
MOUNT_POINT=$(hdiutil attach "$TMPDIR_INSTALL/$DMG_NAME" -nobrowse -quiet | tail -1 | awk '{print $NF}')

if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
  # Fallback: find the mount point
  MOUNT_POINT="/Volumes/$APP_NAME"
  if [ ! -d "$MOUNT_POINT" ]; then
    MOUNT_POINT=$(find /Volumes -maxdepth 1 -name "*nav0*" -type d 2>/dev/null | head -1)
  fi
fi

APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  echo "Error: Could not find .app in DMG"
  exit 1
fi

# Remove old version if it exists
if [ -d "$INSTALL_DIR/$APP_NAME.app" ]; then
  if ! rm -rf "$INSTALL_DIR/$APP_NAME.app"; then
    echo "Error: Failed to remove existing $APP_NAME.app. Is it still running?"
    echo "Please close nav0 and try again."
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
    exit 1
  fi
fi

# Copy to Applications, fall back to ~/Desktop on permission errors
if ! cp -R "$APP_PATH" "$INSTALL_DIR/" 2>/dev/null; then
  INSTALL_DIR="$HOME/Desktop"
  echo "No write access to /Applications, installing to $INSTALL_DIR instead..."
  rm -rf "$INSTALL_DIR/$APP_NAME.app" 2>/dev/null || true
  cp -R "$APP_PATH" "$INSTALL_DIR/"
fi

# Unmount DMG
hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true

# Remove quarantine attribute to prevent Gatekeeper "damaged" warning
xattr -cr "$INSTALL_DIR/$APP_NAME.app"

echo ""
echo "nav0 browser $VERSION ($ARCH_SUFFIX) installed to $INSTALL_DIR"
echo "Launching nav0..."
open "$INSTALL_DIR/$APP_NAME.app"
