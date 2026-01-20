import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import type { NocoDBQuery, NocoDBDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, NocoDBQuery, NocoDBDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
