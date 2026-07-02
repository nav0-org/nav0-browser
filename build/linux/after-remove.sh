#!/bin/sh
# Nav0 — post-remove / post-upgrade maintainer script.
# Wired in as the deb `postrm` and the rpm `postun` scriptlet (see forge.config.ts).
#
# Rebuild the desktop database after Nav0's .desktop file is removed or replaced
# so the launcher entry is cleaned up / refreshed promptly. Best-effort: a
# missing helper must never fail the removal.
set -e

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi

exit 0
