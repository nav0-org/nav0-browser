export abstract class FormatUtils {
  public static getFriendlyDateString(date: Date): string {
    date = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let formattedDate = '';
    if (itemDate.getTime() === today.getTime()) {
      formattedDate = 'Today, ';
    } else if (itemDate.getTime() === yesterday.getTime()) {
      formattedDate = 'Yesterday, ';
    } else {
      formattedDate = FormatUtils.getShortFormattedDate(date) + ', ';
    }

    return formattedDate + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  public static getShortFormattedDate(date: Date): string {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const monthName = monthNames[monthIndex];
    const year = date.getFullYear();
    return `${day}-${monthName}-${year.toString().substring(2, 4)}`;
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
