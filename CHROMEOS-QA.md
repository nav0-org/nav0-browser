# ChromeOS (Crostini) QA Checklist

Nav0 has no dedicated ChromeOS build. On a Chromebook it runs as a **Linux
app inside the Crostini container**, so `process.platform` is `'linux'` and the
regular Linux `.deb` is what ships. This checklist covers the things that
genuinely differ inside the container and therefore can't be verified in CI —
run it on real hardware before claiming ChromeOS support is solid.

You need a Chromebook with the **Linux development environment** enabled
(_Settings → Advanced → Developers → Linux_). Test on both an **Intel (amd64)**
and an **ARM (arm64)** Chromebook if available, since we now ship both builds.

## Install

- [ ] `sudo apt install ./nav0_<version>_<arch>.deb` completes without
      unmet-dependency errors (validates the `depends` list in
      `forge.config.ts`). If `apt` reports missing libs, add them there and to
      the apt list in `.github/workflows/build-electron.yml`.
- [ ] Nav0 appears in the ChromeOS launcher with the correct icon and name.
- [ ] App launches to a rendered window (not a blank/white window — the classic
      symptom of a missing shared library).
- [ ] `About` panel shows **Platform: ChromeOS (Linux)** and the correct
      architecture (x86_64 / ARM64).

## Core behaviour

- [ ] Browse, open/close tabs, navigation, find-in-page all work.
- [ ] Cookies + logins **persist across a full quit and relaunch** (validates
      the `EnableCookieEncryption` fuse → libsecret works in the container).
- [ ] History, bookmarks, downloads persist (SQLite under the container's
      userData path).
- [ ] Private window opens and leaves nothing on disk.

## Container-specific surfaces (most likely to be degraded)

- [ ] **Screen sharing** (`getDisplayMedia` / display-capture picker): expect it
      to only see the container, not the whole ChromeOS desktop. Document the
      observed behaviour; this is a known Crostini limitation, not a blocker.
- [ ] **Web notifications** reach the ChromeOS notification tray (Crostini
      bridges libnotify).
- [ ] **Downloads** land somewhere reachable from the ChromeOS Files app under
      "Linux files".
- [ ] **HiDPI / display scaling**: chrome and content render at a sane size on
      the Chromebook's native (often fractional-scaled) panel.
- [ ] **Microphone / camera** permission prompts work when a site requests them.

## Known limitations (document, don't fix)

- ChromeOS will not let a Crostini app register as the **system default
  browser**. Links from ChromeOS apps still open in Chrome.
- No Play Store / Android presence — distribution is the `.deb` only.

## Notes

Record results (ChromeOS version, board, arch, pass/fail per item) in the PR or
issue so we have a baseline for the next release.
