import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import { NocoDBQuery, NocoDBDataSourceOptions, defaultQuery } from './types';

/**
 * NocoDB DataSource implementation.
 * Communicates with the Go backend via the Grafana plugin proxy.
 */
export class NocoDBDataSource extends DataSourceApi<NocoDBQuery, NocoDBDataSourceOptions> {
  baseURL: string;

  constructor(instanceSettings: DataSourceInstanceSettings<NocoDBDataSourceOptions>) {
    super(instanceSettings);
    this.baseURL = instanceSettings.jsonData.baseURL || '';
  }

  /**
   * Applies template variables to the query.
   */
  applyTemplateVariables(query: NocoDBQuery): NocoDBQuery {
    const templateSrv = getTemplateSrv();
    return {
      ...query,
      tableID: templateSrv.replace(query.tableID),
      fields: templateSrv.replace(query.fields),
      where: templateSrv.replace(query.where),
      sort: templateSrv.replace(query.sort),
    };
  }

  /**
   * Returns default query values.
   */
  getDefaultQuery(): Partial<NocoDBQuery> {
    return defaultQuery;
  }

  /**
   * Executes queries via the backend plugin.
   */
  async query(request: DataQueryRequest<NocoDBQuery>): Promise<DataQueryResponse> {
    const backendSrv = getBackendSrv();
    return backendSrv.datasourceRequest({
      url: '/api/ds/query',
      method: 'POST',
      data: {
        queries: request.targets.map((target) => ({
          ...this.applyTemplateVariables(target),
          datasourceId: this.id,
          intervalMs: request.intervalMs,
          maxDataPoints: request.maxDataPoints,
        })),
      },
    });
  }

  /**
   * Tests the datasource connection.
   */
  async testDatasource(): Promise<{ status: string; message: string }> {
    try {
      const backendSrv = getBackendSrv();
      const result = await backendSrv.datasourceRequest({
        url: `/api/datasources/${this.id}/health`,
        method: 'GET',
      });
      return {
        status: 'success',
        message: result?.data?.message || 'Successfully connected to NocoDB',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        status: 'error',
        message: `Failed to connect to NocoDB: ${message}`,
      };
    }
  }

  /**
   * Filters queries to only include ones with a tableID.
   */
  filterQuery(query: NocoDBQuery): boolean {
    return !!query.tableID;
  }
}
