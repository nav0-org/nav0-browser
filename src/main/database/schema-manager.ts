import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { BookmarksSchema } from './schema/bookmark-schema';
import { BrowsingHistorySchema } from './schema/browsing-history-schema';
import { DownloadsSchema } from './schema/download-schema';


// Define types for our schema
export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NULL';

export type SpecialColumnType =
  | { type: 'uuid'; }
  | { type: 'timestamp'; defaultNow?: boolean; }
  | { type: 'json'; }
  | { type: 'standard'; sqlType: ColumnType; };

export interface ColumnDefinition {
  name: string;
  columnType: SpecialColumnType;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: any;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  };
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indices?: {
    name: string;
    columns: string[];
    unique?: boolean;
  }[];
}

export interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
  dflt_value?: string;
  cid: number;
}

export interface IndexInfo {
  name: string;
  seq: number;
  unique: number;
  origin: string;
  partial: number;
}

export interface SchemaResult {
  created: boolean;
  modified: boolean;
  details: string[];
}

/**
 * Schema manager for SQLite that ensures tables exist and have required columns.
 * Handles special column types like UUIDs.
 */
export class SchemaManager {
  private db: Database.Database;
  private schemas: Map<string, TableSchema> = new Map();
  
  /**
   * Create a new SchemaManager
   */
  constructor(db: Database.Database) {
    this.db = db;
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    
    // Create the functions needed for UUIDs if they don't exist
    this.setupUuidFunctions();
  }
  
  /**
   * Register a schema with the manager
   */
  private registerSchema = (schema: TableSchema): void => {
    this.schemas.set(schema.name, schema);
  }
  
  /**
   * Apply all registered schemas to the database
   */
  public applySchemas = (): Record<string, SchemaResult> => {
    // this.loadSchemasFromDirectory();
    this.loadSchemas();
    const results: Record<string, SchemaResult> = {};
    
    this.schemas.forEach((schema, tableName) => {
      results[tableName] = this.ensureTableSchema(schema);
    });
    
    return results;
  }
  
  /**
   * Set up UUID functions in SQLite
   */
  private setupUuidFunctions = (): void => {
    // Function to generate a UUID
    this.db.function('uuid_generate_v4', () => {
      return uuidv4();
    });
    
    // Function to check if string is a valid UUID
    this.db.function('is_valid_uuid', (id: string) => {
      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return regex.test(id) ? 1 : 0;
    });
  }
  
  /**
   * Get the SQLite type for a special column type
   */
  private getSqliteType = (columnType: SpecialColumnType): string => {
    switch (columnType.type) {
      case 'uuid':
        return 'TEXT';
      case 'timestamp':
        return 'TEXT';
      case 'json':
        return 'TEXT';
      case 'standard':
        return columnType.sqlType;
      default:
        return 'TEXT';
    }
  }
  
  /**
   * Format a default value for SQL
   */
  private formatDefaultValue = (value: any, columnType: SpecialColumnType): string => {
    if (value === null) {
      return 'NULL';
    }
    
    if (columnType.type === 'uuid' && value === 'generate') {
      return '(uuid_generate_v4())';
    }
    
    if (columnType.type === 'timestamp' && columnType.defaultNow) {
      return "CURRENT_TIMESTAMP";
    }
    
    if (columnType.type === 'json') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    } else if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    } else if (Buffer.isBuffer(value)) {
      return `X'${value.toString('hex')}'`;
    } else {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
  }
  
  /**
   * Ensures a table exists and has all the required columns according to the schema.
   * Never drops tables, only creates or alters them.
   */
  ensureTableSchema = (schema: TableSchema): SchemaResult => {
    const result: SchemaResult = {
      created: false,
      modified: false,
      details: []
    };

    // Start a transaction so all operations are atomic
    this.db.prepare('BEGIN TRANSACTION').run();

    try {
      // Check if table exists
      const tableExists = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
      ).get(schema.name);

      if (!tableExists) {
        // Create the table if it doesn't exist
        this.createTable(schema);
        result.created = true;
        result.details.push(`Created table '${schema.name}'`);
      } else {
        // Table exists, get current columns
        const tableInfo = this.db.prepare(`PRAGMA table_info(${schema.name})`).all() as TableInfoRow[];
        const existingColumns = tableInfo.map(col => ({
          name: col.name,
          type: col.type,
          notNull: !!col.notnull,
          primaryKey: !!col.pk,
        }));

        // Find columns to add (in schema but not in existing table)
        const existingColumnNames = existingColumns.map(col => col.name);
        const columnsToAdd = schema.columns.filter(
          col => !existingColumnNames.includes(col.name)
        );

        // Add missing columns
        if (columnsToAdd.length > 0) {
          result.modified = true;
          for (const column of columnsToAdd) {
            this.addColumn(schema.name, column);
            result.details.push(`Added column '${column.name}' to table '${schema.name}'`);
          }
        }

        // Check for column modifications (type changes, nullability, etc.)
        for (const schemaColumn of schema.columns) {
          const existingColumn = existingColumns.find(col => col.name === schemaColumn.name);
          if (existingColumn) {
            const sqliteType = this.getSqliteType(schemaColumn.columnType);
            
            // If types don't match, log it
            if (existingColumn.type !== sqliteType) {
              result.details.push(
                `Column '${schemaColumn.name}' type mismatch: current is '${existingColumn.type}', schema specifies '${sqliteType}'`
              );
            }
            
            // If NOT NULL constraint doesn't match, log it
            if (existingColumn.notNull !== !!schemaColumn.notNull) {
              result.details.push(
                `Column '${schemaColumn.name}' NOT NULL constraint mismatch`
              );
            }
          }
        }
      }

      // Check and add any missing indices
      if (schema.indices && schema.indices.length > 0) {
        const existingIndices = this.db.prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name = ?"
        ).all(schema.name) as { name: string }[];
        
        const existingIndexNames = existingIndices.map(idx => idx.name);
        
        for (const index of schema.indices) {
          if (!existingIndexNames.includes(index.name)) {
            this.createIndex(schema.name, index);
            result.details.push(`Created index '${index.name}' on table '${schema.name}'`);
            result.modified = true;
          }
        }
      }

      // Commit the transaction
      this.db.prepare('COMMIT').run();
    } catch (error) {
      // If anything fails, roll back all changes
      this.db.prepare('ROLLBACK').run();
      throw error;
    }

    return result;
  }
  
  /**
   * Create a new table according to the schema
   */
  private createTable = (schema: TableSchema): void => {
    let sql = `CREATE TABLE IF NOT EXISTS ${schema.name} (\n`;
    
    // Add column definitions
    const columnDefs: string[] = [];
    const foreignKeyDefs: string[] = [];
    
    for (const column of schema.columns) {
      const sqliteType = this.getSqliteType(column.columnType);
      let colDef = `  ${column.name} ${sqliteType}`;
      
      if (column.primaryKey) {
        colDef += ' PRIMARY KEY';
        if (column.autoIncrement) {
          colDef += ' AUTOINCREMENT';
        }
      }
      
      if (column.notNull) {
        colDef += ' NOT NULL';
      }
      
      if (column.unique) {
        colDef += ' UNIQUE';
      }
      
      if (column.defaultValue !== undefined) {
        colDef += ` DEFAULT ${this.formatDefaultValue(column.defaultValue, column.columnType)}`;
      } else if (column.columnType.type === 'uuid' && column.primaryKey) {
        // Auto-generate UUIDs for primary keys
        colDef += ` DEFAULT (uuid_generate_v4())`;
      } else if (column.columnType.type === 'timestamp' && 
                (column.columnType as any).defaultNow) {
        colDef += ` DEFAULT CURRENT_TIMESTAMP`;
      }
      
      columnDefs.push(colDef);
      
      // Add foreign key constraint if specified
      if (column.foreignKey) {
        const fk = column.foreignKey;
        let fkDef = `  FOREIGN KEY (${column.name}) REFERENCES ${fk.table}(${fk.column})`;
        
        if (fk.onDelete) {
          fkDef += ` ON DELETE ${fk.onDelete}`;
        }
        
        if (fk.onUpdate) {
          fkDef += ` ON UPDATE ${fk.onUpdate}`;
        }
        
        foreignKeyDefs.push(fkDef);
      }
    }
    
    // Combine all column and constraint definitions
    sql += [...columnDefs, ...foreignKeyDefs].join(',\n');
    sql += '\n)';
    
    this.db.prepare(sql).run();
  }
  
  /**
   * Add a column to an existing table
   */
  private addColumn = (tableName: string, column: ColumnDefinition): void => {
    const sqliteType = this.getSqliteType(column.columnType);
    let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${sqliteType}`;
    
    if (column.notNull) {
      // SQLite requires a default value when adding a NOT NULL column to an existing table
      if (column.defaultValue !== undefined) {
        sql += ` NOT NULL DEFAULT ${this.formatDefaultValue(column.defaultValue, column.columnType)}`;
      } else if (column.columnType.type === 'uuid') {
        sql += ` NOT NULL DEFAULT (uuid_generate_v4())`;
      } else if (column.columnType.type === 'timestamp' && 
                (column.columnType as any).defaultNow) {
        sql += ` NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      } else if (column.columnType.type === 'json') {
        sql += ` NOT NULL DEFAULT '{}'`;
      } else {
        // Default values by type
        const defaultValueByType: Record<ColumnType, string> = {
          'TEXT': "''",
          'INTEGER': '0',
          'REAL': '0.0',
          'BLOB': "X''",
          'NULL': 'NULL'
        };
        sql += ` NOT NULL DEFAULT ${defaultValueByType[sqliteType as ColumnType]}`;
      }
    } else if (column.defaultValue !== undefined) {
      sql += ` DEFAULT ${this.formatDefaultValue(column.defaultValue, column.columnType)}`;
    } else if (column.columnType.type === 'uuid' && column.primaryKey) {
      sql += ` DEFAULT (uuid_generate_v4())`;
    } else if (column.columnType.type === 'timestamp' && 
              (column.columnType as any).defaultNow) {
      sql += ` DEFAULT CURRENT_TIMESTAMP`;
    }
    
    if (column.unique) {
      sql += ' UNIQUE';
    }
    
    this.db.prepare(sql).run();
  }

  /**
   * Create an index on a table
   */
  private createIndex = (tableName: string, index: {
    name: string;
    columns: string[];
    unique?: boolean;
  }): void => {
    const uniqueStr = index.unique ? 'UNIQUE ' : '';
    const columnStr = index.columns.join(', ');
    
    const sql = `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${index.name} ON ${tableName} (${columnStr})`;
    this.db.prepare(sql).run();
  }
  
  /**
   * Insert a UUID v4 value
   */
  generateUuid = (): string => {
    return uuidv4();
  }
  
  /**
   * Check if a string is a valid UUID v4
   */
  isValidUuid = (id: string): boolean => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(id);
  }

  private loadSchemas = (): void =>{
      this.registerSchema(BookmarksSchema);
      this.registerSchema(BrowsingHistorySchema);
      this.registerSchema(DownloadsSchema);
  }
}