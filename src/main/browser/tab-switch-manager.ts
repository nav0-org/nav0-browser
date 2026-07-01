/**
 * Keyboard tab switching, modelled on holding a modifier and typing a tab
 * number.
 *
 * Alt+1 (Option+1 on macOS) jumps to the first tab, Alt+2 to the second, and
 * so on. Because a tab number can have more than one digit, digits are
 * accumulated while Alt is held down: holding Alt and pressing 1 then 1 targets
 * the 11th tab. The accumulated number is committed — and the switch performed
 * — as soon as Alt is released, or after a short idle timeout as a fallback for
 * when the key-up is never seen (e.g. focus changes mid-chord).
 *
 * State is per-window: each AppWindow owns one instance so digits typed in that
 * window never bleed into another. Matching is done against the physical key
 * (`input.code`, e.g. "Digit1"/"Numpad1") rather than `input.key`, because on
 * macOS Option+digit produces a symbol ("¡", "™", …) in `input.key`.
 */
export class TabSwitchManager {
  private buffer = '';
  private commitTimer: ReturnType<typeof setTimeout> | null = null;

  // Long enough that typing "11" quickly never splits into two switches, short
  // enough to still feel responsive if the Alt key-up is missed.
  private static readonly COMMIT_DELAY_MS = 700;

  private static readonly DIGIT_CODE = /^(?:Digit|Numpad)([0-9])$/;

  constructor(private readonly onSwitch: (oneBasedIndex: number) => void) {}

  /**
   * Feed a `before-input-event` Input. Returns true when the event was consumed
   * and the caller should `preventDefault()` (i.e. an Alt+digit press we
   * swallowed so it never reaches the page). Everything else returns false.
   */
  handleInput(input: Electron.Input): boolean {
    // Accumulate Alt+digit presses. Require Alt without Ctrl/Meta so this never
    // collides with Cmd/Ctrl+digit or other modified combos. Auto-repeat is
    // skipped so holding a digit down doesn't inflate the number (Alt+1 held
    // stays tab 1 rather than becoming "111…" → out of range).
    if (
      input.type === 'keyDown' &&
      input.alt &&
      !input.control &&
      !input.meta &&
      !input.isAutoRepeat
    ) {
      const match = TabSwitchManager.DIGIT_CODE.exec(input.code);
      if (match) {
        this.buffer += match[1];
        this.restartTimer();
        return true;
      }
    }

    // Alt released — commit whatever digits were accumulated.
    if (
      input.type === 'keyUp' &&
      (input.code === 'AltLeft' || input.code === 'AltRight' || input.key === 'Alt')
    ) {
      this.commit();
    }

    return false;
  }

  private restartTimer(): void {
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), TabSwitchManager.COMMIT_DELAY_MS);
  }

  private commit(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    if (!this.buffer) return;
    const index = parseInt(this.buffer, 10);
    this.buffer = '';
    if (Number.isFinite(index) && index >= 1) {
      this.onSwitch(index);
    }
  }

  dispose(): void {
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    this.buffer = '';
  }
}
