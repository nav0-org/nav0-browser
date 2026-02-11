export abstract class HtmlUtils {
  
  public static debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };
  
}