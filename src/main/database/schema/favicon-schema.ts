import { TableSchema } from '../schema-manager';

// The favicon cache (see FaviconCache): one site icon per host.
export const FaviconSchema: TableSchema = {
  name: 'favicon',
  columns: [
    {
      name: 'host',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      primaryKey: true,
      notNull: true,
    },
    {
      name: 'dataUrl',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true,
    },
  ],
};
