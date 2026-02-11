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
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const monthName = monthNames[monthIndex];
    const year = date.getFullYear();
    return `${day}-${monthName}-${year.toString().substring(2, 4)}`;
  }

  public static getFileMetadata(filePath: string): { fileName: string; fileNameWithoutExtension: string; extension: string } {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const basename = normalizedPath.split('/').pop() || '';
    const lastDotIndex = basename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? basename.slice(lastDotIndex) : '';
    const filename = extension ? basename.slice(0, lastDotIndex) : basename;
    
    return { fileName: basename, fileNameWithoutExtension: filename, extension };
  }
}