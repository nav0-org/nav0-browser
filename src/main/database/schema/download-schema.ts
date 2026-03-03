import { TableSchema } from '../schema-manager';

export const DownloadsSchema: TableSchema = {
  name: 'download',
  columns: [
    {
      name: 'id',
      columnType: { type: 'uuid' },
      primaryKey: true,
      notNull: true
    },
    {
      name: 'createdDate',
      columnType: { type: 'timestamp', defaultNow: true },
      notNull: true
    },
    {
      name: 'url',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'fileName',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'fileExtension',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'fileType',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'fileSize',
      columnType: { type: 'standard', sqlType: 'INTEGER' },
      notNull: true
    },
    {
      name: 'fileLocation',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'status',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      defaultValue: 'completed'
    },
    {
      name: 'receivedBytes',
      columnType: { type: 'standard', sqlType: 'INTEGER' },
      defaultValue: 0
    },
    {
      name: 'urlChain',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      defaultValue: '[]'
    },
    {
      name: 'eTag',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      defaultValue: ''
    },
    {
      name: 'lastModified',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      defaultValue: ''
    },
    {
      name: 'startTime',
      columnType: { type: 'standard', sqlType: 'REAL' },
      defaultValue: 0
    }
  ],
  indices: [
    {
      name: 'idxDownloadFileType',
      columns: ['fileType']
    },
    {
      name: 'idxDownloadFileExtension',
      columns: ['fileExtension']
    },
    {
      name: 'idxDownloadCreatedDate',
      columns: ['createdDate']
    },
    {
      name: 'idxDownloadStatus',
      columns: ['status']
    }
  ]
};