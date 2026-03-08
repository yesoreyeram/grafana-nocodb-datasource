import React, { ChangeEvent } from 'react';
import { InlineField, Input, SecretInput } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { NocoDBDataSourceOptions, NocoDBSecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<NocoDBDataSourceOptions, NocoDBSecureJsonData> {}

/**
 * ConfigEditor renders the datasource configuration form.
 */
export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onBaseURLChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        baseURL: event.target.value,
      },
    });
  };

  const onAPITokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...secureJsonData,
        apiToken: event.target.value,
      },
    });
  };

  const onResetAPIToken = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...secureJsonFields,
        apiToken: false,
      },
      secureJsonData: {
        ...secureJsonData,
        apiToken: '',
      },
    });
  };

  return (
    <>
      <InlineField label="Base URL" labelWidth={20} tooltip="The base URL of your NocoDB instance">
        <Input
          onChange={onBaseURLChange}
          value={jsonData.baseURL || ''}
          placeholder="https://your-nocodb-instance.com"
          width={40}
          data-testid="nocodb-config-base-url"
        />
      </InlineField>
      <InlineField label="API Token" labelWidth={20} tooltip="API token for authenticating with NocoDB">
        <SecretInput
          isConfigured={secureJsonFields?.apiToken ?? false}
          value={secureJsonData?.apiToken || ''}
          placeholder="Your NocoDB API token"
          width={40}
          onReset={onResetAPIToken}
          onChange={onAPITokenChange}
          data-testid="nocodb-config-api-token"
        />
      </InlineField>
    </>
  );
}
