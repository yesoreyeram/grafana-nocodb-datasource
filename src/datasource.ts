import { DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import type { NocoDBDataSourceOptions, NocoDBQuery, NocoDBTable, NocoDBProject } from './types';

export class DataSource extends DataSourceWithBackend<NocoDBQuery, NocoDBDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<NocoDBDataSourceOptions>) {
    super(instanceSettings);
  }

  /**
   * Apply template variables to query
   */
  applyTemplateVariables(query: NocoDBQuery, scopedVars: ScopedVars): NocoDBQuery {
    const templateSrv = getTemplateSrv();

    return {
      ...query,
      projectId: query.projectId ? templateSrv.replace(query.projectId, scopedVars) : query.projectId,
      baseId: query.baseId ? templateSrv.replace(query.baseId, scopedVars) : query.baseId,
      tableName: query.tableName ? templateSrv.replace(query.tableName, scopedVars) : query.tableName,
      rawSQL: query.rawSQL ? templateSrv.replace(query.rawSQL, scopedVars) : query.rawSQL,
      timeColumn: query.timeColumn ? templateSrv.replace(query.timeColumn, scopedVars) : query.timeColumn,
    };
  }

  /**
   * Get available projects from NocoDB
   */
  async getProjects(): Promise<NocoDBProject[]> {
    return this.getResource('projects');
  }

  /**
   * Get available tables for a project
   */
  async getTables(projectId?: string, baseId?: string): Promise<NocoDBTable[]> {
    const params: Record<string, string> = {};
    if (projectId) {
      params.projectId = projectId;
    }
    if (baseId) {
      params.baseId = baseId;
    }
    return this.getResource('tables', params);
  }

  /**
   * Filter query to check if it's valid
   */
  filterQuery(query: NocoDBQuery): boolean {
    // Hide queries that are not configured
    if (query.queryType === 'table') {
      return !!query.tableName;
    } else if (query.queryType === 'sql') {
      return !!query.rawSQL;
    }
    return false;
  }
}
