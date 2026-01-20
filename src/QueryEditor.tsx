import React, { useState, useEffect } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  InlineField,
  InlineFieldRow,
  Input,
  Select,
  Button,
  TextArea,
  Switch,
  Icon,
  Alert,
} from '@grafana/ui';
import { DataSource } from './datasource';
import type {
  NocoDBQuery,
  NocoDBDataSourceOptions,
  QueryType,
  NocoDBFilter,
  NocoDBSort,
  queryTypeOptions,
  filterOperatorOptions,
  sortDirectionOptions,
  FilterOperator,
  SortDirection,
} from './types';
import { defaultQuery } from './types';

type Props = QueryEditorProps<DataSource, NocoDBQuery, NocoDBDataSourceOptions>;

export function QueryEditor(props: Props) {
  const { query, onChange, onRunQuery, datasource } = props;
  const [tables, setTables] = useState<Array<SelectableValue<string>>>([]);

  // Merge query with defaults
  const currentQuery = { ...defaultQuery, ...query };

  useEffect(() => {
    // Load available tables
    if (currentQuery.projectId || datasource.instanceSettings.jsonData.projectId) {
      loadTables();
    }
  }, [currentQuery.projectId]);

  const loadTables = async () => {
    try {
      const projectId = currentQuery.projectId || datasource.instanceSettings.jsonData.projectId;
      if (!projectId) {
        return;
      }

      const response = await datasource.getResource('tables', { projectId });
      const tableOptions = response.map((table: any) => ({
        label: table.title || table.table_name,
        value: table.table_name,
      }));
      setTables(tableOptions);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const onQueryChange = (updates: Partial<NocoDBQuery>) => {
    onChange({ ...currentQuery, ...updates });
  };

  const onFilterChange = (index: number, updates: Partial<NocoDBFilter>) => {
    const newFilters = [...(currentQuery.filters || [])];
    newFilters[index] = { ...newFilters[index], ...updates };
    onQueryChange({ filters: newFilters });
  };

  const addFilter = () => {
    const newFilters = [...(currentQuery.filters || []), { column: '', operator: 'eq' as FilterOperator, value: '' }];
    onQueryChange({ filters: newFilters });
  };

  const removeFilter = (index: number) => {
    const newFilters = currentQuery.filters?.filter((_, i) => i !== index) || [];
    onQueryChange({ filters: newFilters });
  };

  const onSortChange = (index: number, updates: Partial<NocoDBSort>) => {
    const newSorts = [...(currentQuery.sorts || [])];
    newSorts[index] = { ...newSorts[index], ...updates };
    onQueryChange({ sorts: newSorts });
  };

  const addSort = () => {
    const newSorts = [...(currentQuery.sorts || []), { column: '', direction: 'asc' as SortDirection }];
    onQueryChange({ sorts: newSorts });
  };

  const removeSort = (index: number) => {
    const newSorts = currentQuery.sorts?.filter((_, i) => i !== index) || [];
    onQueryChange({ sorts: newSorts });
  };

  return (
    <div>
      <InlineFieldRow>
        <InlineField label="Query Type" labelWidth={16} tooltip="Select the type of query to execute">
          <Select
            width={30}
            options={queryTypeOptions}
            value={currentQuery.queryType}
            onChange={(v) => onQueryChange({ queryType: v.value! })}
          />
        </InlineField>
      </InlineFieldRow>

      {currentQuery.queryType === 'table' ? (
        <>
          <InlineFieldRow>
            <InlineField label="Project ID" labelWidth={16} tooltip="NocoDB Project ID (optional if set in datasource config)">
              <Input
                width={30}
                value={currentQuery.projectId || ''}
                onChange={(e) => onQueryChange({ projectId: e.currentTarget.value })}
                placeholder="Leave empty to use datasource default"
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Table" labelWidth={16} tooltip="Select the table to query" required>
              <Select
                width={30}
                options={tables}
                value={currentQuery.tableName}
                onChange={(v) => onQueryChange({ tableName: v.value! })}
                onOpenMenu={loadTables}
                placeholder="Select a table"
                isClearable
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Columns" labelWidth={16} tooltip="Comma-separated list of columns to select (empty = all)">
              <Input
                width={30}
                value={currentQuery.columns?.join(',') || ''}
                onChange={(e) => onQueryChange({ columns: e.currentTarget.value.split(',').map(c => c.trim()).filter(c => c) })}
                placeholder="column1, column2, ... (empty = all)"
              />
            </InlineField>
          </InlineFieldRow>

          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Filters</strong>
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={addFilter}
                style={{ marginLeft: '8px' }}
              >
                Add Filter
              </Button>
            </div>

            {currentQuery.filters?.map((filter, index) => (
              <InlineFieldRow key={index}>
                <InlineField label="Column" labelWidth={12}>
                  <Input
                    width={15}
                    value={filter.column || ''}
                    onChange={(e) => onFilterChange(index, { column: e.currentTarget.value })}
                    placeholder="column name"
                  />
                </InlineField>

                <InlineField label="Operator">
                  <Select
                    width={15}
                    options={filterOperatorOptions}
                    value={filter.operator}
                    onChange={(v) => onFilterChange(index, { operator: v.value! })}
                  />
                </InlineField>

                <InlineField label="Value">
                  <Input
                    width={15}
                    value={filter.value as string || ''}
                    onChange={(e) => onFilterChange(index, { value: e.currentTarget.value })}
                    placeholder="filter value"
                  />
                </InlineField>

                <Button
                  variant="destructive"
                  size="sm"
                  icon="trash-alt"
                  onClick={() => removeFilter(index)}
                />
              </InlineFieldRow>
            ))}
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <strong>Sorting</strong>
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={addSort}
                style={{ marginLeft: '8px' }}
              >
                Add Sort
              </Button>
            </div>

            {currentQuery.sorts?.map((sort, index) => (
              <InlineFieldRow key={index}>
                <InlineField label="Column" labelWidth={12}>
                  <Input
                    width={20}
                    value={sort.column || ''}
                    onChange={(e) => onSortChange(index, { column: e.currentTarget.value })}
                    placeholder="column name"
                  />
                </InlineField>

                <InlineField label="Direction">
                  <Select
                    width={15}
                    options={sortDirectionOptions}
                    value={sort.direction}
                    onChange={(v) => onSortChange(index, { direction: v.value! })}
                  />
                </InlineField>

                <Button
                  variant="destructive"
                  size="sm"
                  icon="trash-alt"
                  onClick={() => removeSort(index)}
                />
              </InlineFieldRow>
            ))}
          </div>

          <InlineFieldRow>
            <InlineField label="Limit" labelWidth={16} tooltip="Maximum number of rows to return">
              <Input
                type="number"
                width={15}
                value={currentQuery.limit || 1000}
                onChange={(e) => onQueryChange({ limit: parseInt(e.currentTarget.value, 10) })}
              />
            </InlineField>

            <InlineField label="Offset" tooltip="Number of rows to skip">
              <Input
                type="number"
                width={15}
                value={currentQuery.offset || 0}
                onChange={(e) => onQueryChange({ offset: parseInt(e.currentTarget.value, 10) })}
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Time Column" labelWidth={16} tooltip="Column to use for time series data">
              <Input
                width={30}
                value={currentQuery.timeColumn || ''}
                onChange={(e) => onQueryChange({ timeColumn: e.currentTarget.value })}
                placeholder="Optional for time series"
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Enable Cache" labelWidth={16} tooltip="Cache query results">
              <Switch
                value={currentQuery.useCache !== false}
                onChange={(e) => onQueryChange({ useCache: e.currentTarget.checked })}
              />
            </InlineField>

            {currentQuery.useCache !== false && (
              <InlineField label="Cache Duration (s)">
                <Input
                  type="number"
                  width={15}
                  value={currentQuery.cacheDuration || 300}
                  onChange={(e) => onQueryChange({ cacheDuration: parseInt(e.currentTarget.value, 10) })}
                />
              </InlineField>
            )}
          </InlineFieldRow>
        </>
      ) : (
        <>
          <Alert title="Raw SQL Query" severity="warning">
            Raw SQL queries have limitations and must be SELECT statements only. Use table queries for better features and security.
          </Alert>

          <InlineFieldRow>
            <InlineField label="Project ID" labelWidth={16} required>
              <Input
                width={30}
                value={currentQuery.projectId || ''}
                onChange={(e) => onQueryChange({ projectId: e.currentTarget.value })}
                placeholder="Required for SQL queries"
              />
            </InlineField>
          </InlineFieldRow>

          <InlineFieldRow>
            <InlineField label="Base ID" labelWidth={16} required>
              <Input
                width={30}
                value={currentQuery.baseId || ''}
                onChange={(e) => onQueryChange({ baseId: e.currentTarget.value })}
                placeholder="Required for SQL queries"
              />
            </InlineField>
          </InlineFieldRow>

          <div style={{ marginTop: '12px' }}>
            <label>SQL Query</label>
            <TextArea
              rows={10}
              value={currentQuery.rawSQL || ''}
              onChange={(e) => onQueryChange({ rawSQL: e.currentTarget.value })}
              placeholder="SELECT * FROM table_name WHERE ..."
            />
          </div>
        </>
      )}

      <div style={{ marginTop: '16px' }}>
        <Button onClick={onRunQuery}>Run Query</Button>
      </div>
    </div>
  );
}
