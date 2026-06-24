import * as fs from 'fs';
import path from 'path';

export abstract class Utils {
  /**
   * Detects whether we're running inside ChromeOS's Linux container (Crostini).
   *
   * ChromeOS has no dedicated Electron platform — `process.platform` reports
   * `'linux'` because the app runs in a Debian VM. So every Linux code path
   * applies unchanged; this helper is purely for labeling / UX (e.g. the About
   * panel and issue reports) and must never gate behaviour away from the Linux
   * branch.
   *
   * `/dev/.cros_milestone` is written by the ChromeOS guest tools, and
   * `SOMMELIER_VERSION` is exported by Sommelier, the Wayland/X proxy that
   * bridges container windows to the ChromeOS compositor. Either is a reliable
   * Crostini marker.
   */
  public static isChromeOS(): boolean {
    if (process.platform !== 'linux') return false;
    try {
      if (process.env.SOMMELIER_VERSION) return true;
      return fs.existsSync('/dev/.cros_milestone');
    } catch {
      return false;
    }
  }

  /**
   * Returns a file path that won't overwrite an existing file. If the desired
   * path is free it is returned unchanged; otherwise a Chrome-style numeric
   * suffix is inserted before the extension ("report.pdf" → "report (1).pdf"
   * → "report (2).pdf").
   */
  public static getUniqueFilePath(desiredPath: string): string {
    if (!fs.existsSync(desiredPath)) return desiredPath;

    const dir = path.dirname(desiredPath);
    const ext = path.extname(desiredPath);
    const base = path.basename(desiredPath, ext);

    let counter = 1;
    let candidate: string;
    do {
      candidate = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
    } while (fs.existsSync(candidate));

    return candidate;
  }

  public static getFileType(
    fileExtension: string
  ): 'document' | 'image' | 'archive' | 'audio' | 'video' | 'file' | 'executable' | 'other' {
    const typeMap = {
      document: [
        'pdf',
        'doc',
        'docx',
        'txt',
        'rtf',
        'odt',
        'xls',
        'xlsx',
        'csv',
        'ppt',
        'pptx',
        'odp',
        'ods',
        'md',
        'pages',
        'numbers',
        'tex',
        'epub',
        'mobi',
        'ott',
        'pptm',
        'xlsm',
      ],
      image: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'svg',
        'webp',
        'tiff',
        'tif',
        'ico',
        'psd',
        'ai',
        'heic',
        'heif',
        'avif',
        'jxl',
        'eps',
        'raw',
        'cr2',
        'nef',
        'dng',
        'arw',
        'exr',
        'hdr',
        'jfif',
        'jpe',
        'jp2',
        'pcx',
        'tga',
      ],
      archive: [
        'zip',
        'rar',
        '7z',
        'tar',
        'gz',
        'bz2',
        'xz',
        'iso',
        'dmg',
        'zst',
        'cab',
        'tgz',
        'lz',
        'lzma',
      ],
      audio: [
        'mp3',
        'wav',
        'ogg',
        'flac',
        'aac',
        'm4a',
        'wma',
        'aiff',
        'opus',
        'mid',
        'midi',
        'ape',
        'amr',
        'ac3',
        'dts',
        'mp2',
        'au',
        'caf',
        'alac',
      ],
      video: [
        'mp4',
        'mov',
        'avi',
        'mkv',
        'wmv',
        'flv',
        'webm',
        'm4v',
        'mpg',
        'mpeg',
        '3gp',
        '3g2',
        'ogv',
        'mxf',
        'ts',
        'vob',
      ],
      file: [
        'json',
        'xml',
        'yaml',
        'toml',
        'ini',
        'cfg',
        'conf',
        'log',
        'sql',
        'dat',
        'html',
        'htm',
        'css',
      ],
      executable: [
        'exe',
        'msi',
        'app',
        'sh',
        'bat',
        'cmd',
        'com',
        'gadget',
        'jar',
        'py',
        'js',
        'deb',
        'rpm',
        'pkg',
        'apk',
        'appimage',
        'snap',
        'flatpak',
        'ipa',
        'run',
        'bin',
      ],
    };

    for (const [type, extensions] of Object.entries(typeMap) as [
      keyof typeof typeMap,
      string[],
    ][]) {
      if (extensions.includes(fileExtension)) {
        return type;
      }
    }

    return 'other';
  }
}
