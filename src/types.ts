import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

/**
 * NocoDB query model - represents a query to be executed against a NocoDB table.
 */
export interface NocoDBQuery extends DataQuery {
  /** The ID of the NocoDB table to query */
  tableID: string;
  /** Comma-separated list of field names to include */
  fields: string;
  /** NocoDB filter expression, e.g. (Name,eq,test) */
  where: string;
  /** Sort expression, e.g. -CreatedAt for descending */
  sort: string;
  /** Maximum number of records to return */
  limit: number;
  /** Number of records to skip */
  offset: number;
}

/**
 * Default query values.
 */
export const defaultQuery: Partial<NocoDBQuery> = {
  tableID: '',
  fields: '',
  where: '',
  sort: '',
  limit: 100,
  offset: 0,
};

/**
 * NocoDB datasource configuration options stored in jsonData.
 */
export interface NocoDBDataSourceOptions extends DataSourceJsonData {
  /** The base URL of the NocoDB instance */
  baseURL: string;
}

/**
 * Secure JSON data - sensitive fields stored encrypted.
 */
export interface NocoDBSecureJsonData {
  /** API token for authenticating with NocoDB */
  apiToken?: string;
}
