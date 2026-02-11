export type DocumentChunkRecord = {
  id: string; // uuid
  content: string;
  sequence: number;
  vectorEmbedding?: number[];
  documentId: string;
  createdDate: Date;
  lastModifiedDate: Date;
}