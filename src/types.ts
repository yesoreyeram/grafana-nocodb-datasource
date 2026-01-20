import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

/**
 * Query types supported by NocoDB
 */
export enum QueryType {
  Table = 'table',
  SQL = 'sql',
}

/**
 * Sort direction for query results
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Filter operators for NocoDB queries
 */
export enum FilterOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  LIKE = 'like',
  NLIKE = 'nlike',
  IS_NULL = 'is null',
  IS_NOT_NULL = 'is not null',
  IN = 'in',
  NOT_IN = 'not in',
  BETWEEN = 'between',
}

/**
 * Filter condition for NocoDB queries
 */
export interface NocoDBFilter {
  column?: string;
  operator?: FilterOperator;
  value?: string | number | boolean;
  logicalOperator?: 'and' | 'or';
}

/**
 * Sort configuration
 */
export interface NocoDBSort {
  column?: string;
  direction?: SortDirection;
}

/**
 * NocoDB query definition
 */
export interface NocoDBQuery extends DataQuery {
  // Query type: table or raw SQL
  queryType: QueryType;

  // Table query options
  tableName?: string;
  projectId?: string;
  baseId?: string;

  // Column selection
  columns?: string[];

  // Filters
  filters?: NocoDBFilter[];

  // Sorting
  sorts?: NocoDBSort[];

  // Pagination
  limit?: number;
  offset?: number;

  // Raw SQL query
  rawSQL?: string;

  // Time column for time series
  timeColumn?: string;

  // Value columns for metrics
  valueColumns?: string[];

  // Grouping
  groupBy?: string[];

  // Aggregation
  aggregation?: {
    type?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    column?: string;
  };

  // Cache settings
  useCache?: boolean;
  cacheDuration?: number;
}

/**
 * Default query settings
 */
export const defaultQuery: Partial<NocoDBQuery> = {
  queryType: QueryType.Table,
  limit: 1000,
  offset: 0,
  filters: [],
  sorts: [],
  columns: [],
  useCache: true,
  cacheDuration: 300,
};

/**
 * DataSource configuration options
 */
export interface NocoDBDataSourceOptions extends DataSourceJsonData {
  // NocoDB server URL (e.g., https://app.nocodb.com or self-hosted URL)
  url?: string;

  // Default project/base to use
  projectId?: string;
  baseId?: string;

  // Connection timeout in seconds
  timeout?: number;

  // Enable TLS verification
  tlsSkipVerify?: boolean;

  // Rate limiting
  maxRequestsPerSecond?: number;

  // Query settings
  defaultLimit?: number;
  maxLimit?: number;

  // Enable query caching
  enableCache?: boolean;
  defaultCacheDuration?: number;
}

/**
 * Secure data stored in Grafana's encrypted database
 */
export interface NocoDBSecureJsonData {
  // API token for authentication
  apiToken?: string;
}

/**
 * NocoDB table metadata
 */
export interface NocoDBTable {
  id: string;
  title: string;
  table_name: string;
  type: string;
  enabled: boolean;
  columns?: NocoDBColumn[];
}

/**
 * NocoDB column metadata
 */
export interface NocoDBColumn {
  id: string;
  title: string;
  column_name: string;
  uidt: string; // UI Data Type
  dt: string; // Database Type
  np?: string; // Numeric Precision
  ns?: string; // Numeric Scale
  pk?: boolean; // Primary Key
  ai?: boolean; // Auto Increment
  rqd?: boolean; // Required
  un?: boolean; // Unsigned
  system?: boolean;
}

/**
 * NocoDB project metadata
 */
export interface NocoDBProject {
  id: string;
  title: string;
  bases?: NocoDBBase[];
}

/**
 * NocoDB base metadata
 */
export interface NocoDBBase {
  id: string;
  project_id: string;
  alias?: string;
  type: string;
  enabled: boolean;
}

/**
 * Query result row type
 */
export interface NocoDBRow {
  [key: string]: any;
}

/**
 * API response types
 */
export interface NocoDBListResponse<T> {
  list: T[];
  pageInfo: {
    totalRows?: number;
    page?: number;
    pageSize?: number;
    isFirstPage?: boolean;
    isLastPage?: boolean;
  };
}

/**
 * Health check response
 */
export interface NocoDBHealthResponse {
  status: 'ok' | 'error';
  message?: string;
  version?: string;
}

/**
 * Error response from NocoDB API
 */
export interface NocoDBError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Selectable value helpers
 */
export const queryTypeOptions: Array<SelectableValue<QueryType>> = [
  { label: 'Table', value: QueryType.Table, description: 'Query data from a NocoDB table' },
  { label: 'Raw SQL', value: QueryType.SQL, description: 'Execute raw SQL query' },
];

export const filterOperatorOptions: Array<SelectableValue<FilterOperator>> = [
  { label: 'Equals', value: FilterOperator.EQ },
  { label: 'Not Equals', value: FilterOperator.NEQ },
  { label: 'Greater Than', value: FilterOperator.GT },
  { label: 'Greater Than or Equal', value: FilterOperator.GTE },
  { label: 'Less Than', value: FilterOperator.LT },
  { label: 'Less Than or Equal', value: FilterOperator.LTE },
  { label: 'Like', value: FilterOperator.LIKE },
  { label: 'Not Like', value: FilterOperator.NLIKE },
  { label: 'Is Null', value: FilterOperator.IS_NULL },
  { label: 'Is Not Null', value: FilterOperator.IS_NOT_NULL },
  { label: 'In', value: FilterOperator.IN },
  { label: 'Not In', value: FilterOperator.NOT_IN },
  { label: 'Between', value: FilterOperator.BETWEEN },
];

export const sortDirectionOptions: Array<SelectableValue<SortDirection>> = [
  { label: 'Ascending', value: SortDirection.ASC },
  { label: 'Descending', value: SortDirection.DESC },
];
