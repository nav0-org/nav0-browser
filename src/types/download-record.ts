export type DownloadRecord = {
  id: string,
  createdDate: Date,
  fileName: string,
  url: string,
  fileExtension: string,
  fileType: 'document' | 'image' | 'archive' | 'audio' | 'file' | 'executable' | 'other',
  fileSize: number,
  fileLocation: string,
  status: 'completed' | 'in_progress' | 'paused' | 'cancelled',
  receivedBytes: number,
  urlChain: string,
  eTag: string,
  lastModified: string,
  startTime: number
}