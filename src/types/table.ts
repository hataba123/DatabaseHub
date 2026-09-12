export type SqlDataType =
  | 'nvarchar(50)'
  | 'nvarchar(255)'
  | 'nvarchar(max)'
  | 'varchar(50)'
  | 'int'
  | 'bigint'
  | 'bit'
  | 'datetime'
  | 'datetime2'
  | 'decimal(18,2)'
  | 'float'
  | 'uniqueidentifier';

export interface DatabaseColumn {
  name: string;
  dataType: SqlDataType | string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
  defaultValue?: string | null;
  description?: string;
}

export interface DatabaseIndex {
  name: string;
  type: 'Clustered' | 'Non-Clustered' | 'Unique' | 'Spatial';
  columns: string[];
  isUnique: boolean;
  sizeKb?: number;
}

export interface DatabaseRelationship {
  constraintName: string;
  column: string;
  foreignTable: string;
  foreignColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'NO ACTION';
}

export interface DatabaseObjectItem {
  id: string;
  name: string;
  schema: string;
  type: 'table' | 'view' | 'procedure';
  rowCount?: number;
  dataSizeMb?: number;
  indexSizeMb?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type FilterOperator =
  // String
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  // Number
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  // Boolean
  | 'isTrue'
  | 'isFalse'
  // Date
  | 'dateEquals'
  | 'dateBefore'
  | 'dateAfter'
  | 'dateBetween';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For between
}

export interface TableQueryParams {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend' | null;
  filters?: FilterCondition[];
}

export interface TableDataResponse<T = Record<string, any>> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TableSchema {
  databaseId: string;
  tableName: string;
  schema: string;
  columns: DatabaseColumn[];
  indexes: DatabaseIndex[];
  relationships: DatabaseRelationship[];
}
