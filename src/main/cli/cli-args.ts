export interface CLIArgs {
  isPrivate: boolean;
  urls: string[];
}

const PRIVATE_FLAGS = new Set(['-p', '--private']);
const URL_FLAGS = new Set(['-u', '--url']);

// Common Electron / Chromium flags we should never confuse for a value to one
// of our own flags (e.g. when scanning forward after `--url` for URL arguments).
const ELECTRON_FLAG_PREFIXES = [
  '--enable-',
  '--disable-',
  '--no-sandbox',
  '--remote-debugging-',
  '--inspect',
  '--app-window-id=',
  '--is-private=',
  '--platform=',
  '--user-data-dir=',
  '--lang=',
  '--proxy-',
  '--type=',
];

function isElectronInternalFlag(arg: string): boolean {
  if (!arg.startsWith('-')) return false;
  return ELECTRON_FLAG_PREFIXES.some((p) => arg.startsWith(p));
}

function looksLikeUrl(value: string): boolean {
  if (!value || value.startsWith('-')) return false;
  // Allow explicit schemes
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return true;
  // Bare domain or domain with path/query/fragment
  return /^[^\s/?#]+\.[^\s/?#]+(?:[/?#].*)?$/i.test(value);
}

function normalizeUrl(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * Parse Nav0-specific CLI flags from an argv array. Unknown args are ignored
 * so Chromium / Electron switches pass through harmlessly.
 *
 * Supported syntax:
 *   -p, --private                      open in a private window
 *   -u, --url <url> [<url> ...]        open url(s) as tabs in a new window
 *   --url=<url>, -u=<url>              equals form (single url)
 */
export function parseCLIArgs(argv: readonly string[]): CLIArgs {
  const result: CLIArgs = { isPrivate: false, urls: [] };
  const seen = new Set<string>();

  const pushUrl = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!seen.has(url)) {
      seen.add(url);
      result.urls.push(url);
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (PRIVATE_FLAGS.has(arg)) {
      result.isPrivate = true;
      continue;
    }
    if (URL_FLAGS.has(arg)) {
      // Consume contiguous URL-like values after the flag
      while (i + 1 < argv.length) {
        const next = argv[i + 1];
        if (isElectronInternalFlag(next)) break;
        if (PRIVATE_FLAGS.has(next) || URL_FLAGS.has(next)) break;
        if (!looksLikeUrl(next)) break;
        pushUrl(next);
        i++;
      }
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq > 0) {
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (URL_FLAGS.has(key) && looksLikeUrl(value)) {
        pushUrl(value);
      }
    }
  }

  return result;
}

export function hasCLIOverride(args: CLIArgs): boolean {
  return args.isPrivate || args.urls.length > 0;
}
