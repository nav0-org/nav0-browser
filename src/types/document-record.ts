import { DocumentChunkRecord } from "./document-chunk-record";

export type DocumentRecord = {
  id: string; // uuid
  fileType: 'document' | 'image' | 'webpage';
  fileName: string;
  filePath: string;
  extension: string;
  fileSize: number;
  source: 'user-uploaded' | 'web-crawled' | 'llm-generated';
  vectorEmbedding?: number[]; // embeddings, optional
  projectId?: string; // uuid, optional (foreign key)
  messageId?: string; // uuid, optional (foreign key)
  createdDate: Date;
  lastModifiedDate: Date;
  documentChunks?: DocumentChunkRecord[]; // optional, for eager loading
}