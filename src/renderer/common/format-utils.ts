export abstract class FormatUtils {
  // The app's one time and date format. `undefined` is the app locale (the language
  // Electron gives the page). The hour never takes a leading zero: "5:03 PM" in US
  // English, "5:03 pm" in Indian English, "17:03" in British English. Dates read
  // "May 24", with the year only when it isn't the current year. Relative labels
  // ("Today, 5:03 PM", "5mo ago") build on these.
  private static readonly TIME = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  private static readonly DATE = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });
  private static readonly DATE_WITH_YEAR = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  private static readonly DATE_TIME = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  private static readonly DATE_WITH_YEAR_TIME = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  private static toValidDate(date: Date | string | number): Date | null {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  private static isThisYear(date: Date): boolean {
    return date.getFullYear() === new Date().getFullYear();
  }

  // "5:03 PM"
  public static formatTime(date: Date | string | number): string {
    const d = FormatUtils.toValidDate(date);
    return d ? FormatUtils.TIME.format(d) : '';
  }

  // "May 24", or "May 24, 2025" outside the current year
  public static formatDate(date: Date | string | number): string {
    const d = FormatUtils.toValidDate(date);
    if (!d) return '';
    return (FormatUtils.isThisYear(d) ? FormatUtils.DATE : FormatUtils.DATE_WITH_YEAR).format(d);
  }

  // "May 24, 5:03 PM", or "May 24, 2025, 5:03 PM" outside the current year
  public static formatDateTime(date: Date | string | number): string {
    const d = FormatUtils.toValidDate(date);
    if (!d) return '';
    const format = FormatUtils.isThisYear(d)
      ? FormatUtils.DATE_TIME
      : FormatUtils.DATE_WITH_YEAR_TIME;
    return format.format(d);
  }

  public static formatFileSize(bytes: number): string {
    if (bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[i]}`;
  }

  public static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  public static getRelativeDayLabel(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.floor((today.getTime() - target.getTime()) / 86400000);
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return date.toLocaleDateString([], { weekday: 'long' }).toLowerCase();
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase();
  }

  public static getFileMetadata(filePath: string): {
    fileName: string;
    fileNameWithoutExtension: string;
    extension: string;
  } {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const basename = normalizedPath.split('/').pop() || '';
    const lastDotIndex = basename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? basename.slice(lastDotIndex) : '';
    const filename = extension ? basename.slice(0, lastDotIndex) : basename;

    return { fileName: basename, fileNameWithoutExtension: filename, extension };
  }
}
