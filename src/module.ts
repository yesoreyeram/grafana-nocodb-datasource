import { DataSourcePlugin } from '@grafana/data';
import { NocoDBDataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { NocoDBQuery, NocoDBDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<NocoDBDataSource, NocoDBQuery, NocoDBDataSourceOptions>(NocoDBDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
