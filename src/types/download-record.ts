export type DownloadRecord = {
  id: string,
  createdDate: Date,
  fileName: string,
  url: string,
  fileExtension: string,
  fileType: 'document' | 'image' | 'archive' | 'audio' | 'file' | 'executable' | 'other',
  fileSize: number,
  fileLocation: string
}