export abstract class Utils { 
  public static getFileType(fileExtension: string) : "document"|"image"|"archive"|"audio"|"file"|"executable"|"other" {
  const typeMap = {
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'odp', 'ods', 'md', 'pages', 'numbers'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico', 'psd', 'ai'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'opus'],
    file: ['json', 'xml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log', 'sql', 'dat'],
    executable: ['exe', 'msi', 'app', 'sh', 'bat', 'cmd', 'com', 'gadget', 'jar', 'py', 'js']
  };
  
  for (const [type, extensions] of Object.entries(typeMap) as [keyof typeof typeMap, string[]][]) {
    if (extensions.includes(fileExtension)) {
      return type;
    }
  }
  
  return "other";
  }
}
