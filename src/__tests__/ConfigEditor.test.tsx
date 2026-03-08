import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfigEditor } from '../components/ConfigEditor';

// Mock @grafana/runtime
const mockFetch = jest.fn();
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({
    fetch: mockFetch,
  })),
}));

// Mock @emotion/css
jest.mock('@emotion/css', () => ({
  css: (...args: any[]) => '',
}));

// Mock @grafana/ui components
jest.mock('@grafana/ui', () => ({
  Alert: ({ children, title, severity, ...props }: any) => (
    <div data-testid={props['data-testid']} data-severity={severity}>
      <strong>{title}</strong>
      {children}
    </div>
  ),
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button
      data-testid={props['data-testid']}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`} />,
  Input: (props: any) => (
    <input
      data-testid={props['data-testid']}
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  ),
  SecretInput: (props: any) => (
    <input
      data-testid={props['data-testid']}
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      type="password"
    />
  ),
  Spinner: () => <span data-testid="spinner" />,
  useStyles2: (fn: any) => {
    // Return a proxy that returns empty string for any property
    return new Proxy(
      {},
      {
        get: () => '',
      }
    );
  },
}));

describe('ConfigEditor', () => {
  const defaultProps = {
    options: {
      id: 1,
      uid: 'test',
      orgId: 1,
      name: 'NocoDB',
      type: 'yesoreyeram-nocodb-datasource',
      typeName: 'NocoDB',
      typeLogoUrl: '',
      access: 'proxy' as const,
      url: '',
      user: '',
      database: '',
      basicAuth: false,
      basicAuthUser: '',
      isDefault: false,
      readOnly: false,
      withCredentials: false,
      jsonData: {
        baseURL: '',
      },
      secureJsonFields: {},
      secureJsonData: {
        apiToken: '',
      },
    },
    onOptionsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Wizard structure tests ---

  it('should render wizard stepper with 3 steps', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('wizard-stepper')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-0')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-2')).toBeInTheDocument();
  });

  it('should render connection panel first by default', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('wizard-panel-connection')).toBeInTheDocument();
  });

  it('should render base URL input in connection step', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('nocodb-config-base-url')).toBeInTheDocument();
  });

  it('should render test connection button', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('test-connection-button')).toBeInTheDocument();
  });

  // --- Step 2 and 3 should be locked initially ---

  it('should disable auth step when connection is not verified', () => {
    render(<ConfigEditor {...defaultProps} />);
    const authStep = screen.getByTestId('wizard-step-1');
    expect(authStep).toBeDisabled();
  });

  it('should disable confirm step when auth is not verified', () => {
    render(<ConfigEditor {...defaultProps} />);
    const confirmStep = screen.getByTestId('wizard-step-2');
    expect(confirmStep).toBeDisabled();
  });

  // --- Field onChange handlers ---

  it('should call onOptionsChange when base URL changes', () => {
    render(<ConfigEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-config-base-url');
    fireEvent.change(input, { target: { value: 'http://localhost:8080' } });

    expect(defaultProps.onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonData: expect.objectContaining({
          baseURL: 'http://localhost:8080',
        }),
      })
    );
  });

  it('should display existing base URL', () => {
    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: {
          baseURL: 'http://existing-url.com',
        },
      },
    };

    render(<ConfigEditor {...props} />);
    expect(screen.getByTestId('nocodb-config-base-url')).toHaveValue('http://existing-url.com');
  });

  // --- Frontend URL Validation ---

  it('should show error when base URL is empty and test connection is clicked', () => {
    render(<ConfigEditor {...defaultProps} />);

    const button = screen.getByTestId('test-connection-button');
    fireEvent.click(button);

    expect(screen.getByTestId('base-url-error')).toBeInTheDocument();
    expect(screen.getByTestId('base-url-error')).toHaveTextContent('Base URL is required');
  });

  it('should show error for invalid URL format', () => {
    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: {
          baseURL: 'not-a-valid-url',
        },
      },
    };

    render(<ConfigEditor {...props} />);

    const button = screen.getByTestId('test-connection-button');
    fireEvent.click(button);

    expect(screen.getByTestId('base-url-error')).toBeInTheDocument();
    expect(screen.getByTestId('base-url-error')).toHaveTextContent('URL must start with http:// or https://');
  });
});

