import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import {
  Field,
  Input,
  SecretInput,
  Switch,
  FieldSet,
  Alert,
  InlineField,
  InlineFieldRow,
} from '@grafana/ui';
import type { NocoDBDataSourceOptions, NocoDBSecureJsonData } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<NocoDBDataSourceOptions, NocoDBSecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  /**
   * Update a JSON data field
   */
  const onJSONDataChange = <K extends keyof NocoDBDataSourceOptions>(key: K, value: NocoDBDataSourceOptions[K]) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        [key]: value,
      },
    });
  };

  /**
   * Update a secure JSON data field
   */
  const onSecureJSONDataChange = (key: keyof NocoDBSecureJsonData, value: string) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...secureJsonData,
        [key]: value,
      },
    });
  };

  /**
   * Reset a secure field
   */
  const onResetSecureField = (key: keyof NocoDBSecureJsonData) => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...secureJsonFields,
        [key]: false,
      },
      secureJsonData: {
        ...secureJsonData,
        [key]: '',
      },
    });
  };

  return (
    <div className="gf-form-group">
      <Alert title="NocoDB Configuration" severity="info">
        Configure your NocoDB connection settings. The API token is stored securely and never exposed to the frontend.
      </Alert>

      <FieldSet label="Connection Settings">
        <Field
          label="NocoDB URL"
          description="The base URL of your NocoDB instance (e.g., https://app.nocodb.com or your self-hosted URL)"
          required
        >
          <Input
            width={60}
            value={jsonData.url || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onJSONDataChange('url', e.currentTarget.value)}
            placeholder="https://app.nocodb.com"
          />
        </Field>

        <Field
          label="API Token"
          description="Your NocoDB API token. You can generate one in your NocoDB account settings."
          required
        >
          <SecretInput
            width={60}
            value={secureJsonData?.apiToken || ''}
            isConfigured={secureJsonFields?.apiToken ?? false}
            onReset={() => onResetSecureField('apiToken')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSecureJSONDataChange('apiToken', e.currentTarget.value)}
            placeholder="Enter your API token"
          />
        </Field>
      </FieldSet>

      <FieldSet label="Default Settings">
        <Field
          label="Default Project ID"
          description="Optional: Set a default project ID to use for queries"
        >
          <Input
            width={60}
            value={jsonData.projectId || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onJSONDataChange('projectId', e.currentTarget.value)}
            placeholder="Optional project ID"
          />
        </Field>

        <Field
          label="Default Base ID"
          description="Optional: Set a default base ID to use for queries"
        >
          <Input
            width={60}
            value={jsonData.baseId || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onJSONDataChange('baseId', e.currentTarget.value)}
            placeholder="Optional base ID"
          />
        </Field>
      </FieldSet>

      <FieldSet label="Connection Options">
        <InlineFieldRow>
          <InlineField
            label="Request Timeout"
            labelWidth={20}
            tooltip="Maximum time in seconds to wait for a request to complete"
          >
            <Input
              type="number"
              width={20}
              value={jsonData.timeout || 30}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onJSONDataChange('timeout', parseInt(e.currentTarget.value, 10))
              }
              placeholder="30"
            />
          </InlineField>
        </InlineFieldRow>

        <InlineFieldRow>
          <InlineField
            label="Skip TLS Verification"
            labelWidth={20}
            tooltip="Skip TLS certificate verification (not recommended for production)"
          >
            <Switch
              value={jsonData.tlsSkipVerify || false}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJSONDataChange('tlsSkipVerify', e.currentTarget.checked)}
            />
          </InlineField>
        </InlineFieldRow>
      </FieldSet>

      <FieldSet label="Query Limits">
        <InlineFieldRow>
          <InlineField
            label="Default Limit"
            labelWidth={20}
            tooltip="Default number of rows to return if not specified in query"
          >
            <Input
              type="number"
              width={20}
              value={jsonData.defaultLimit || 1000}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onJSONDataChange('defaultLimit', parseInt(e.currentTarget.value, 10))
              }
              placeholder="1000"
            />
          </InlineField>
        </InlineFieldRow>

        <InlineFieldRow>
          <InlineField
            label="Maximum Limit"
            labelWidth={20}
            tooltip="Maximum number of rows that can be returned in a single query"
          >
            <Input
              type="number"
              width={20}
              value={jsonData.maxLimit || 10000}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onJSONDataChange('maxLimit', parseInt(e.currentTarget.value, 10))
              }
              placeholder="10000"
            />
          </InlineField>
        </InlineFieldRow>
      </FieldSet>

      <FieldSet label="Caching">
        <InlineFieldRow>
          <InlineField
            label="Enable Caching"
            labelWidth={20}
            tooltip="Cache query results to improve performance"
          >
            <Switch
              value={jsonData.enableCache !== false}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onJSONDataChange('enableCache', e.currentTarget.checked)}
            />
          </InlineField>
        </InlineFieldRow>

        {jsonData.enableCache !== false && (
          <InlineFieldRow>
            <InlineField
              label="Default Cache Duration"
              labelWidth={20}
              tooltip="Default cache duration in seconds"
            >
              <Input
                type="number"
                width={20}
                value={jsonData.defaultCacheDuration || 300}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onJSONDataChange('defaultCacheDuration', parseInt(e.currentTarget.value, 10))
                }
                placeholder="300"
              />
            </InlineField>
          </InlineFieldRow>
        )}
      </FieldSet>
    </div>
  );
}
