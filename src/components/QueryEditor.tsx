import React, { ChangeEvent } from 'react';
import { InlineField, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { NocoDBDataSource } from '../datasource';
import { NocoDBDataSourceOptions, NocoDBQuery, defaultQuery } from '../types';

type Props = QueryEditorProps<NocoDBDataSource, NocoDBQuery, NocoDBDataSourceOptions>;

/**
 * QueryEditor renders the query configuration form.
 */
export function QueryEditor(props: Props) {
  const { query, onChange, onRunQuery } = props;

  const onTableIDChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, tableID: event.target.value });
  };

  const onFieldsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, fields: event.target.value });
  };

  const onWhereChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, where: event.target.value });
  };

  const onSortChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, sort: event.target.value });
  };

  const onLimitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const limit = parseInt(event.target.value, 10);
    onChange({ ...query, limit: isNaN(limit) ? defaultQuery.limit! : limit });
  };

  const onOffsetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const offset = parseInt(event.target.value, 10);
    onChange({ ...query, offset: isNaN(offset) ? defaultQuery.offset! : offset });
  };

  const onBlur = () => {
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Table ID" labelWidth={16} tooltip="The ID of the NocoDB table to query">
        <Input
          onChange={onTableIDChange}
          onBlur={onBlur}
          value={query.tableID || ''}
          placeholder="Enter table ID"
          width={40}
          data-testid="nocodb-query-table-id"
        />
      </InlineField>
      <InlineField label="Fields" labelWidth={16} tooltip="Comma-separated list of field names to include">
        <Input
          onChange={onFieldsChange}
          onBlur={onBlur}
          value={query.fields || ''}
          placeholder="field1,field2"
          width={40}
          data-testid="nocodb-query-fields"
        />
      </InlineField>
      <InlineField label="Where" labelWidth={16} tooltip="NocoDB filter expression, e.g. (Name,eq,test)">
        <Input
          onChange={onWhereChange}
          onBlur={onBlur}
          value={query.where || ''}
          placeholder="(field,op,value)"
          width={40}
          data-testid="nocodb-query-where"
        />
      </InlineField>
      <InlineField label="Sort" labelWidth={16} tooltip="Sort expression, prefix with - for descending">
        <Input
          onChange={onSortChange}
          onBlur={onBlur}
          value={query.sort || ''}
          placeholder="-CreatedAt"
          width={40}
          data-testid="nocodb-query-sort"
        />
      </InlineField>
      <InlineField label="Limit" labelWidth={16} tooltip="Maximum number of records to return">
        <Input
          onChange={onLimitChange}
          onBlur={onBlur}
          value={query.limit ?? defaultQuery.limit}
          type="number"
          width={20}
          data-testid="nocodb-query-limit"
        />
      </InlineField>
      <InlineField label="Offset" labelWidth={16} tooltip="Number of records to skip">
        <Input
          onChange={onOffsetChange}
          onBlur={onBlur}
          value={query.offset ?? defaultQuery.offset}
          type="number"
          width={20}
          data-testid="nocodb-query-offset"
        />
      </InlineField>
    </>
  );
}
