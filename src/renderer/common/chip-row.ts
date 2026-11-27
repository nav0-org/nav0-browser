// The chips of a chip row (DESIGN.md §5.3) stay on one line. When they
// outgrow the column the strip scrolls sideways, a fade marks each edge with
// more chips past it (the .more-before / .more-after classes in global.css),
// and a mouse wheel scrolls it too. Attach once per .chip-row-chips; the page
// can re-render the chips inside it as often as it likes.
export abstract class ChipRow {
  // How far past a faded edge a chosen chip is brought in: the fade's width,
  // --spacing-xl.
  private static readonly FADE = 32;

  public static attach(strip: HTMLElement): void {
    const update = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      strip.classList.toggle('more-before', strip.scrollLeft > 1);
      strip.classList.toggle('more-after', strip.scrollLeft < max - 1);
    };

    // When a different chip is chosen, bring it clear of the fades. Only the
    // strip scrolls: scrollIntoView() would also scroll the page.
    let chosenLabel: string | null = null;
    const revealChosen = () => {
      const chip = strip.querySelector<HTMLElement>('.chip.selected, .chip.active');
      const label = chip?.textContent?.trim() ?? null;
      if (!chip || label === chosenLabel) return;
      chosenLabel = label;
      const stripBox = strip.getBoundingClientRect();
      const chipBox = chip.getBoundingClientRect();
      if (chipBox.left < stripBox.left + ChipRow.FADE) {
        strip.scrollLeft -= stripBox.left + ChipRow.FADE - chipBox.left;
      } else if (chipBox.right > stripBox.right - ChipRow.FADE) {
        strip.scrollLeft += chipBox.right - (stripBox.right - ChipRow.FADE);
      }
    };

    new MutationObserver(() => {
      revealChosen();
      update();
    }).observe(strip, { childList: true });
    new ResizeObserver(update).observe(strip);
    strip.addEventListener('scroll', update, { passive: true });

    // A wheel scrolls the strip sideways while it can still move that way;
    // at either end the page scrolls as usual. Sideways swipes are native.
    strip.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = strip.scrollWidth - strip.clientWidth;
        if (e.deltaY < 0 ? strip.scrollLeft <= 0 : strip.scrollLeft >= max - 1) return;
        e.preventDefault();
        strip.scrollLeft += e.deltaY;
      },
      { passive: false }
    );

    revealChosen();
    update();
  }
}
