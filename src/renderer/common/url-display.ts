// Display-only helpers for URLs drawn in the browser chrome and overlays. The stored URL
// (what gets navigated, compared and saved) never changes; only what's shown does.

// A URL split for the address field's at-rest display. Joined in order, the parts give
// the displayed string; only `domain` is emphasised, everything else is muted.
export interface UrlDisplayParts {
  // The scheme without its separator: `https`, `http`, or `nav0` for built-in pages.
  scheme: string;
  // `://` plus any user info and subdomains, e.g. `://en.`
  beforeDomain: string;
  // The registrable domain, a whole IP address or single-label host, or a built-in page's name.
  domain: string;
  // Port, path, query and hash, e.g. `/wiki/Web_browser`.
  afterDomain: string;
}

export abstract class UrlDisplay {
  // Second-level labels that sit under a two-letter country code (bbc.co.uk,
  // example.com.au). No Public Suffix List is bundled, so this is a heuristic.
  private static readonly COUNTRY_SECOND_LEVELS = new Set([
    'co',
    'com',
    'net',
    'org',
    'gov',
    'edu',
    'ac',
    'ne',
    'or',
    'go',
    'ltd',
    'plc',
  ]);

  // Built-in pages are stored as `Nav0://…` but always shown as `nav0://…`.
  public static format(url: string): string {
    return url.replace(/^nav0:\/\//i, 'nav0://');
  }

  // Splits an address-field value so the registrable domain can be emphasised:
  // http(s) URLs and built-in pages. Returns null for anything that gets no
  // emphasis — other schemes (file:, data:, about:, blob:, view-source:), typed
  // search text and unparseable values.
  public static split(value: string): UrlDisplayParts | null {
    const shown = UrlDisplay.format(value);

    const builtIn = /^nav0:\/\/([^/?#\s]+)([\s\S]*)$/.exec(shown);
    if (builtIn) {
      return { scheme: 'nav0', beforeDomain: '://', domain: builtIn[1], afterDomain: builtIn[2] };
    }

    const web = /^(https?):\/\/([^/?#]*)([\s\S]*)$/i.exec(shown);
    if (!web) return null;
    const [, scheme, authority, rest] = web;
    if (/\s/.test(authority)) return null;

    const at = authority.lastIndexOf('@');
    const userInfo = authority.slice(0, at + 1);
    // The host is a bracketed IPv6 literal or everything up to the port.
    const [, host, port] = /^(\[[^\]]*\]|[^:]*)([\s\S]*)$/.exec(authority.slice(at + 1));
    if (!host) return null;

    const domain = UrlDisplay.registrableDomain(host);
    return {
      scheme,
      beforeDomain: `://${userInfo}${host.slice(0, host.length - domain.length)}`,
      domain,
      afterDomain: port + rest,
    };
  }

  // IP addresses and single-label hosts (localhost) are emphasised whole;
  // otherwise the last two labels, or the last three under a country-code
  // second level (bbc.co.uk).
  private static registrableDomain(host: string): string {
    if (host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}\.?$/.test(host)) return host;
    const trailingDot = host.endsWith('.') ? '.' : '';
    const labels = host.slice(0, host.length - trailingDot.length).split('.');
    if (labels.length <= 2) return host;
    const topLevel = labels[labels.length - 1];
    const secondLevel = labels[labels.length - 2].toLowerCase();
    const count =
      /^[a-z]{2}$/i.test(topLevel) && UrlDisplay.COUNTRY_SECOND_LEVELS.has(secondLevel) ? 3 : 2;
    return labels.slice(-count).join('.') + trailingDot;
  }
}
