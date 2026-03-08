import React, { useState, useCallback, ChangeEvent } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, Icon, Input, SecretInput, Spinner, useStyles2 } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { NocoDBDataSourceOptions, NocoDBSecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<NocoDBDataSourceOptions, NocoDBSecureJsonData> {}

/** Validation status for each wizard step. */
type StepStatus = 'idle' | 'loading' | 'success' | 'error';

/** URL regex: must start with http:// or https:// */
const URL_REGEX = /^https?:\/\/.+/i;

/**
 * ConfigEditor renders a 3-step wizard for datasource configuration.
 *
 * Step 1: Connection — enter & validate NocoDB base URL
 * Step 2: Authentication — enter & validate API token
 * Step 3: Confirmation — review settings summary
 */
export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;
  const styles = useStyles2(getStyles);

  // Wizard state
  const [activeStep, setActiveStep] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<StepStatus>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [authStatus, setAuthStatus] = useState<StepStatus>('idle');
  const [authMessage, setAuthMessage] = useState('');

  // Frontend validation errors
  const [baseURLError, setBaseURLError] = useState('');
  const [apiTokenError, setApiTokenError] = useState('');

  // --- Field change handlers ---

  const onBaseURLChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;
      // Normalize: trim trailing slashes
      if (value.endsWith('/')) {
        value = value.replace(/\/+$/, '');
      }
      onOptionsChange({
        ...options,
        jsonData: { ...jsonData, baseURL: value },
      });
      // Reset connection validation when URL changes
      setConnectionStatus('idle');
      setConnectionMessage('');
      setBaseURLError('');
    },
    [jsonData, onOptionsChange, options]
  );

  const onAPITokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onOptionsChange({
        ...options,
        secureJsonData: { ...secureJsonData, apiToken: event.target.value },
      });
      // Reset auth validation when token changes
      setAuthStatus('idle');
      setAuthMessage('');
      setApiTokenError('');
    },
    [secureJsonData, onOptionsChange, options]
  );

  const onResetAPIToken = useCallback(() => {
    onOptionsChange({
      ...options,
      secureJsonFields: { ...secureJsonFields, apiToken: false },
      secureJsonData: { ...secureJsonData, apiToken: '' },
    });
    setAuthStatus('idle');
    setAuthMessage('');
    setApiTokenError('');
  }, [secureJsonFields, secureJsonData, onOptionsChange, options]);

  // --- Frontend Validations ---

  const validateBaseURL = useCallback((): boolean => {
    const url = jsonData.baseURL || '';
    if (!url.trim()) {
      setBaseURLError('Base URL is required');
      return false;
    }
    if (!URL_REGEX.test(url)) {
      setBaseURLError('URL must start with http:// or https://');
      return false;
    }
    setBaseURLError('');
    return true;
  }, [jsonData]);

  const validateAPIToken = useCallback((): boolean => {
    const isConfigured = secureJsonFields?.apiToken ?? false;
    const token = secureJsonData?.apiToken || '';
    if (!isConfigured && !token.trim()) {
      setApiTokenError('API token is required');
      return false;
    }
    if (!isConfigured && token.trim().length < 8) {
      setApiTokenError('API token must be at least 8 characters long');
      return false;
    }
    setApiTokenError('');
    return true;
  }, [secureJsonFields, secureJsonData]);

  // --- Backend Validations via Resource Calls ---

  const testConnection = useCallback(async () => {
    if (!validateBaseURL()) {
      return;
    }
    setConnectionStatus('loading');
    setConnectionMessage('');

    try {
      const response = await getBackendSrv().fetch({
        url: `/api/datasources/${options.id}/resources/validate-connection`,
        method: 'GET',
      }).toPromise();

      const body = response?.data as { status: string; message: string };
      if (body?.status === 'success') {
        setConnectionStatus('success');
        setConnectionMessage(body.message || 'Connection successful');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(body?.message || 'Connection failed');
      }
    } catch (err: unknown) {
      setConnectionStatus('error');
      const message = err instanceof Error ? err.message : 'Connection failed';
      setConnectionMessage(message);
    }
  }, [options.id, validateBaseURL]);

  const testAuth = useCallback(async () => {
    if (!validateAPIToken()) {
      return;
    }
    setAuthStatus('loading');
    setAuthMessage('');

    try {
      const response = await getBackendSrv().fetch({
        url: `/api/datasources/${options.id}/resources/validate-auth`,
        method: 'GET',
      }).toPromise();

      const body = response?.data as { status: string; message: string };
      if (body?.status === 'success') {
        setAuthStatus('success');
        setAuthMessage(body.message || 'Authentication successful');
      } else {
        setAuthStatus('error');
        setAuthMessage(body?.message || 'Authentication failed');
      }
    } catch (err: unknown) {
      setAuthStatus('error');
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthMessage(message);
    }
  }, [options.id, validateAPIToken]);

  // --- Step Navigation ---

  const canProceedToAuth = connectionStatus === 'success';
  const canProceedToConfirm = authStatus === 'success';

  const goToStep = useCallback(
    (step: number) => {
      if (step === 1 && !canProceedToAuth) {
        return;
      }
      if (step === 2 && !canProceedToConfirm) {
        return;
      }
      setActiveStep(step);
    },
    [canProceedToAuth, canProceedToConfirm]
  );

  // --- Render ---

  const steps = [
    { label: 'Connection', icon: 'link' as const, status: connectionStatus },
    { label: 'Authentication', icon: 'lock' as const, status: authStatus },
    { label: 'Confirmation', icon: 'check-circle' as const, status: (canProceedToConfirm ? 'success' : 'idle') as StepStatus },
  ];

  return (
    <div className={styles.container}>
      {/* Step Progress Bar */}
      <div className={styles.stepper} data-testid="wizard-stepper">
        {steps.map((step, index) => {
          const isActive = activeStep === index;
          const isCompleted = step.status === 'success';
          const isAccessible =
            index === 0 ||
            (index === 1 && canProceedToAuth) ||
            (index === 2 && canProceedToConfirm);

          return (
            <React.Fragment key={step.label}>
              {index > 0 && (
                <div
                  className={css`
                    ${styles.stepConnector};
                    ${isAccessible ? styles.stepConnectorActive : ''}
                  `}
                  data-testid={`wizard-connector-${index}`}
                />
              )}
              <button
                type="button"
                className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ''} ${
                  isCompleted ? styles.stepButtonCompleted : ''
                }`}
                onClick={() => isAccessible && goToStep(index)}
                disabled={!isAccessible}
                data-testid={`wizard-step-${index}`}
              >
                <div className={styles.stepIcon}>
                  {isCompleted ? (
                    <Icon name="check" size="lg" />
                  ) : step.status === 'loading' ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className={styles.stepNumber}>{index + 1}</span>
                  )}
                </div>
                <span className={styles.stepLabel}>{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {/* Step 1: Connection */}
        {activeStep === 0 && (
          <div className={styles.stepPanel} data-testid="wizard-panel-connection">
            <h4 className={styles.stepTitle}>
              <Icon name="link" className={styles.stepTitleIcon} />
              Connection Settings
            </h4>
            <p className={styles.stepDescription}>
              Enter the base URL of your NocoDB instance. We will verify that the server is reachable.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                Base URL <span className={styles.required}>*</span>
              </label>
              <Input
                onChange={onBaseURLChange}
                value={jsonData.baseURL || ''}
                placeholder="https://your-nocodb-instance.com"
                width={50}
                data-testid="nocodb-config-base-url"
                invalid={!!baseURLError}
              />
              {baseURLError && (
                <div className={styles.fieldError} data-testid="base-url-error">
                  {baseURLError}
                </div>
              )}
              <div className={styles.fieldHint}>
                Example: https://nocodb.example.com or http://localhost:8080
              </div>
            </div>

            <div className={styles.actionRow}>
              <Button
                onClick={testConnection}
                disabled={connectionStatus === 'loading'}
                variant="primary"
                icon={connectionStatus === 'loading' ? undefined : 'play'}
                data-testid="test-connection-button"
              >
                {connectionStatus === 'loading' ? (
                  <>
                    <Spinner inline size="sm" /> Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>

              {canProceedToAuth && (
                <Button
                  onClick={() => goToStep(1)}
                  variant="secondary"
                  icon="arrow-right"
                  data-testid="next-to-auth-button"
                >
                  Next: Authentication
                </Button>
              )}
            </div>

            {connectionStatus === 'success' && (
              <Alert title="Connection Successful" severity="success" data-testid="connection-success">
                {connectionMessage}
              </Alert>
            )}
            {connectionStatus === 'error' && (
              <Alert title="Connection Failed" severity="error" data-testid="connection-error">
                {connectionMessage}
              </Alert>
            )}
          </div>
        )}

        {/* Step 2: Authentication */}
        {activeStep === 1 && (
          <div className={styles.stepPanel} data-testid="wizard-panel-auth">
            <h4 className={styles.stepTitle}>
              <Icon name="lock" className={styles.stepTitleIcon} />
              Authentication
            </h4>
            <p className={styles.stepDescription}>
              Enter your NocoDB API token. This token will be stored securely and encrypted.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                API Token <span className={styles.required}>*</span>
              </label>
              <SecretInput
                isConfigured={secureJsonFields?.apiToken ?? false}
                value={secureJsonData?.apiToken || ''}
                placeholder="Your NocoDB API token"
                width={50}
                onReset={onResetAPIToken}
                onChange={onAPITokenChange}
                data-testid="nocodb-config-api-token"
              />
              {apiTokenError && (
                <div className={styles.fieldError} data-testid="api-token-error">
                  {apiTokenError}
                </div>
              )}
              <div className={styles.fieldHint}>
                {"You can find your API token in NocoDB under Team & Settings → API Tokens."}
              </div>
            </div>

            <div className={styles.actionRow}>
              <Button
                onClick={() => goToStep(0)}
                variant="secondary"
                icon="arrow-left"
                data-testid="back-to-connection-button"
              >
                Back
              </Button>
              <Button
                onClick={testAuth}
                disabled={authStatus === 'loading'}
                variant="primary"
                icon={authStatus === 'loading' ? undefined : 'shield'}
                data-testid="test-auth-button"
              >
                {authStatus === 'loading' ? (
                  <>
                    <Spinner inline size="sm" /> Verifying Token...
                  </>
                ) : (
                  'Verify Authentication'
                )}
              </Button>

              {canProceedToConfirm && (
                <Button
                  onClick={() => goToStep(2)}
                  variant="secondary"
                  icon="arrow-right"
                  data-testid="next-to-confirm-button"
                >
                  Next: Review
                </Button>
              )}
            </div>

            {authStatus === 'success' && (
              <Alert title="Authentication Successful" severity="success" data-testid="auth-success">
                {authMessage}
              </Alert>
            )}
            {authStatus === 'error' && (
              <Alert title="Authentication Failed" severity="error" data-testid="auth-error">
                {authMessage}
              </Alert>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {activeStep === 2 && (
          <div className={styles.stepPanel} data-testid="wizard-panel-confirm">
            <h4 className={styles.stepTitle}>
              <Icon name="check-circle" className={styles.stepTitleIcon} />
              Configuration Summary
            </h4>
            <p className={styles.stepDescription}>
              {"Review your settings below. Click \"Save & Test\" to apply."}
            </p>

            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Base URL</span>
                <span className={styles.summaryValue} data-testid="summary-base-url">
                  {jsonData.baseURL}
                </span>
                <Icon name="check-circle" className={styles.summaryCheck} />
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>API Token</span>
                <span className={styles.summaryValue} data-testid="summary-api-token">
                  ••••••••••••
                </span>
                <Icon name="check-circle" className={styles.summaryCheck} />
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Connection</span>
                <span className={styles.summaryValue}>Verified</span>
                <Icon name="check-circle" className={styles.summaryCheck} />
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Authentication</span>
                <span className={styles.summaryValue}>Verified</span>
                <Icon name="check-circle" className={styles.summaryCheck} />
              </div>
            </div>

            <div className={styles.actionRow}>
              <Button
                onClick={() => goToStep(1)}
                variant="secondary"
                icon="arrow-left"
                data-testid="back-to-auth-button"
              >
                Back
              </Button>
            </div>

            <Alert title="Ready to save" severity="info" data-testid="confirm-info">
              {"All validations have passed. Click the \"Save & Test\" button below to save your datasource configuration."}
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css`
      max-width: 720px;
    `,
    stepper: css`
      display: flex;
      align-items: center;
      margin-bottom: ${theme.spacing(4)};
      padding: ${theme.spacing(2)} ${theme.spacing(3)};
      background: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.radius.default};
    `,
    stepConnector: css`
      flex: 1;
      height: 2px;
      background: ${theme.colors.border.medium};
      margin: 0 ${theme.spacing(1)};
      transition: background 0.3s ease;
    `,
    stepConnectorActive: css`
      background: ${theme.colors.success.main};
    `,
    stepButton: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: ${theme.spacing(1)};
      min-width: 100px;
      transition: opacity 0.2s ease;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `,
    stepButtonActive: css`
      opacity: 1;
    `,
    stepButtonCompleted: css`
      opacity: 1;
    `,
    stepIcon: css`
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${theme.colors.background.canvas};
      border: 2px solid ${theme.colors.border.medium};
      margin-bottom: ${theme.spacing(0.5)};
      transition: all 0.3s ease;
      color: ${theme.colors.text.secondary};
    `,
    stepNumber: css`
      font-size: ${theme.typography.h5.fontSize};
      font-weight: ${theme.typography.fontWeightBold};
      color: ${theme.colors.text.secondary};
    `,
    stepLabel: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
      font-weight: ${theme.typography.fontWeightMedium};
    `,
    stepContent: css`
      min-height: 300px;
    `,
    stepPanel: css`
      padding: ${theme.spacing(3)};
      background: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.radius.default};
      border: 1px solid ${theme.colors.border.weak};
    `,
    stepTitle: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(1)};
      margin: 0 0 ${theme.spacing(1)} 0;
      font-size: ${theme.typography.h4.fontSize};
      color: ${theme.colors.text.primary};
    `,
    stepTitleIcon: css`
      color: ${theme.colors.primary.text};
    `,
    stepDescription: css`
      color: ${theme.colors.text.secondary};
      margin-bottom: ${theme.spacing(3)};
      font-size: ${theme.typography.body.fontSize};
    `,
    fieldGroup: css`
      margin-bottom: ${theme.spacing(3)};
    `,
    fieldLabel: css`
      display: block;
      font-weight: ${theme.typography.fontWeightMedium};
      margin-bottom: ${theme.spacing(0.5)};
      color: ${theme.colors.text.primary};
    `,
    required: css`
      color: ${theme.colors.error.text};
    `,
    fieldError: css`
      color: ${theme.colors.error.text};
      font-size: ${theme.typography.bodySmall.fontSize};
      margin-top: ${theme.spacing(0.5)};
    `,
    fieldHint: css`
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      margin-top: ${theme.spacing(0.5)};
    `,
    actionRow: css`
      display: flex;
      gap: ${theme.spacing(1.5)};
      margin-bottom: ${theme.spacing(2)};
      margin-top: ${theme.spacing(2)};
    `,
    summaryCard: css`
      background: ${theme.colors.background.canvas};
      border: 1px solid ${theme.colors.border.weak};
      border-radius: ${theme.shape.radius.default};
      padding: ${theme.spacing(2)};
      margin-bottom: ${theme.spacing(2)};
    `,
    summaryRow: css`
      display: flex;
      align-items: center;
      padding: ${theme.spacing(1)} 0;
    `,
    summaryLabel: css`
      width: 140px;
      font-weight: ${theme.typography.fontWeightMedium};
      color: ${theme.colors.text.secondary};
    `,
    summaryValue: css`
      flex: 1;
      color: ${theme.colors.text.primary};
      font-family: ${theme.typography.fontFamilyMonospace};
    `,
    summaryCheck: css`
      color: ${theme.colors.success.main};
      margin-left: ${theme.spacing(1)};
    `,
    summaryDivider: css`
      height: 1px;
      background: ${theme.colors.border.weak};
    `,
  };
}
