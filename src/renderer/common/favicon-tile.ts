// The favicon fallback tile (DESIGN.md §5.3): the site's first letter on a grey
// tile, wherever a site icon is missing or fails to load. Its look is the
// .favicon-tile class in global.css; the slot it sits in sets its size.
export abstract class FaviconTile {
  // The tile's letter: the first letter of the host, without "www.". Takes a
  // URL or a bare host.
  public static letter(url: string): string {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      // Not a URL: a bare host, or anything else, gives its own first letter.
    }
    const name = (host || url || '').replace(/^www\./i, '');
    return name.charAt(0).toUpperCase() || '?';
  }

  // The tile as markup, for pages that build rows from HTML strings.
  public static html(url: string): string {
    const letter = FaviconTile.letter(url).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
    );
    return `<span class="favicon-tile" aria-hidden="true">${letter}</span>`;
  }

  public static create(url: string): HTMLSpanElement {
    const tile = document.createElement('span');
    tile.className = 'favicon-tile';
    tile.setAttribute('aria-hidden', 'true');
    tile.textContent = FaviconTile.letter(url);
    return tile;
  }

  // A site's icon: its image, which turns into the tile if it fails to load,
  // or the tile when there is none.
  public static icon(faviconUrl: string | null | undefined, url: string): HTMLElement {
    if (!faviconUrl) return FaviconTile.create(url);
    const img = document.createElement('img');
    img.alt = '';
    FaviconTile.attachFallback(img, url);
    img.src = faviconUrl;
    return img;
  }

  // Swaps an icon <img> for the tile if it fails to load. The CSPs of the
  // built-in pages and the overlay block inline onerror handlers, so it's
  // wired from script: attach it in the task that gave the image its src.
  public static attachFallback(img: HTMLImageElement | null, url: string): void {
    img?.addEventListener('error', () => img.replaceWith(FaviconTile.create(url)), {
      once: true,
    });
  }
}
