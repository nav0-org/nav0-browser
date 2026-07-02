#!/bin/sh
# Nav0 — post-install / post-upgrade maintainer script.
# Wired in as the deb `postinst` and the rpm `post` scriptlet (see forge.config.ts).
#
# The packaged .desktop file categorises Nav0 as `Network;WebBrowser;`, so it
# belongs under the "Internet" menu group. Overwriting the .desktop on upgrade
# is not enough on its own: desktop environments — notably Linux Mint / Cinnamon
# — cache the desktop + icon databases, so an entry first seen under the old
# `Utility` category (which lands in "Accessories") can stick there until those
# caches are rebuilt. That is exactly what happens when upgrading over a Nav0
# build from before the category fix.
#
# Refresh the caches here — the same thing Chrome / VS Code / Slack do in their
# packages — so the launcher and its menu category update as soon as Nav0 is
# installed. Every step is best-effort: a missing helper must never fail the
# install.
set -e

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

exit 0
