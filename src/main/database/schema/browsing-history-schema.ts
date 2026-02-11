import { TableSchema } from '../schema-manager';

export const BrowsingHistorySchema: TableSchema = {
  name: 'browsingHistory',
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
      name: 'title',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'topLevelDomain',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true
    },
    {
      name: 'faviconUrl',
      columnType: { type: 'standard', sqlType: 'TEXT' }
      // No notNull constraint since it's optional
    }
  ],
  indices: [
    {
      name: 'idxBrowsingHistoryUrl',
      columns: ['url']
    },
    {
      name: 'idxBrowsingHistoryTopLevelDomain',
      columns: ['topLevelDomain']
    },
    {
      name: 'idxBrowsingHistoryCreatedDate',
      columns: ['createdDate']
    }
  ]
};
