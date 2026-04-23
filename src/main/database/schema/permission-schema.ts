import { TableSchema } from '../schema-manager';

export const PermissionSchema: TableSchema = {
  name: 'site_permission',
  columns: [
    {
      name: 'id',
      columnType: { type: 'uuid' },
      primaryKey: true,
      notNull: true,
    },
    {
      name: 'origin',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true,
    },
    {
      name: 'permissionType',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true,
    },
    {
      name: 'decision',
      columnType: { type: 'standard', sqlType: 'TEXT' },
      notNull: true,
    },
    {
      name: 'createdAt',
      columnType: { type: 'timestamp', defaultNow: true },
      notNull: true,
    },
    {
      name: 'lastAccessedAt',
      columnType: { type: 'timestamp', defaultNow: true },
      notNull: true,
    },
  ],
  indices: [
    {
      name: 'idxPermissionOrigin',
      columns: ['origin'],
    },
    {
      name: 'idxPermissionOriginType',
      columns: ['origin', 'permissionType'],
      unique: true,
    },
  ],
};
