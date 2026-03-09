import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ConfigEditor } from '../components/ConfigEditor';
import { of, throwError } from 'rxjs';

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
  Spinner: ({ inline }: any) => <span data-testid="spinner" />,
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

  it('should strip trailing slashes from base URL on change', () => {
    render(<ConfigEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-config-base-url');
    fireEvent.change(input, { target: { value: 'http://localhost:8080/' } });

    expect(defaultProps.onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonData: expect.objectContaining({
          baseURL: 'http://localhost:8080',
        }),
      })
    );
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

  it('should not call backend when frontend validation fails', () => {
    render(<ConfigEditor {...defaultProps} />);

    const button = screen.getByTestId('test-connection-button');
    fireEvent.click(button);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // --- Backend connection test ---

  it('should show success alert after successful connection test', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Successfully connected to NocoDB instance' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/datasources/1/resources/validate-connection',
        method: 'GET',
      })
    );
    expect(screen.getByTestId('connection-success')).toBeInTheDocument();
  });

  it('should show error alert after failed connection test', async () => {
    mockFetch.mockReturnValue(
      throwError(() => new Error('Connection refused'))
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:9999' },
      },
    };

    render(<ConfigEditor {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('connection-error')).toBeInTheDocument();
  });

  it('should enable auth step after successful connection', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    const authStep = screen.getByTestId('wizard-step-1');
    expect(authStep).not.toBeDisabled();
  });

  it('should show Next button after successful connection', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    expect(screen.getByTestId('next-to-auth-button')).toBeInTheDocument();
  });

  it('should navigate to auth step when Next button is clicked', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });

    fireEvent.click(screen.getByTestId('next-to-auth-button'));

    expect(screen.getByTestId('wizard-panel-auth')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-config-api-token')).toBeInTheDocument();
  });

  // --- Auth step tests ---

  it('should show API token error when token is empty and verify is clicked', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    // Navigate to auth step
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });
    fireEvent.click(screen.getByTestId('next-to-auth-button'));

    // Click verify without entering token
    fireEvent.click(screen.getByTestId('test-auth-button'));

    expect(screen.getByTestId('api-token-error')).toBeInTheDocument();
    expect(screen.getByTestId('api-token-error')).toHaveTextContent('API token is required');
  });

  it('should show error for short API token', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
        secureJsonData: { apiToken: 'short' },
      },
    };

    render(<ConfigEditor {...props} />);

    // Navigate to auth step
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });
    fireEvent.click(screen.getByTestId('next-to-auth-button'));

    // Click verify with short token
    fireEvent.click(screen.getByTestId('test-auth-button'));

    expect(screen.getByTestId('api-token-error')).toBeInTheDocument();
    expect(screen.getByTestId('api-token-error')).toHaveTextContent('API token must be at least 8 characters');
  });

  it('should navigate back to connection step from auth step', async () => {
    mockFetch.mockReturnValue(
      of({ data: { status: 'success', message: 'Connected' } })
    );

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
      },
    };

    render(<ConfigEditor {...props} />);

    // Navigate to auth step
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });
    fireEvent.click(screen.getByTestId('next-to-auth-button'));
    expect(screen.getByTestId('wizard-panel-auth')).toBeInTheDocument();

    // Navigate back
    fireEvent.click(screen.getByTestId('back-to-connection-button'));
    expect(screen.getByTestId('wizard-panel-connection')).toBeInTheDocument();
  });

  // --- Full wizard flow ---

  it('should complete full wizard flow: connection → auth → confirm', async () => {
    // First call: connection success, second call: auth success
    mockFetch
      .mockReturnValueOnce(of({ data: { status: 'success', message: 'Connected' } }))
      .mockReturnValueOnce(of({ data: { status: 'success', message: 'Token valid' } }));

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
        secureJsonData: { apiToken: 'valid-api-token-12345' },
      },
    };

    render(<ConfigEditor {...props} />);

    // Step 1: Test connection
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });
    expect(screen.getByTestId('connection-success')).toBeInTheDocument();

    // Navigate to auth
    fireEvent.click(screen.getByTestId('next-to-auth-button'));
    expect(screen.getByTestId('wizard-panel-auth')).toBeInTheDocument();

    // Step 2: Test auth
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-auth-button'));
    });
    expect(screen.getByTestId('auth-success')).toBeInTheDocument();

    // Navigate to confirmation
    fireEvent.click(screen.getByTestId('next-to-confirm-button'));
    expect(screen.getByTestId('wizard-panel-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('summary-base-url')).toHaveTextContent('http://localhost:8080');
    expect(screen.getByTestId('confirm-info')).toBeInTheDocument();
  });

  it('should show auth error alert on failed auth verification', async () => {
    mockFetch
      .mockReturnValueOnce(of({ data: { status: 'success', message: 'Connected' } }))
      .mockReturnValueOnce(throwError(() => new Error('Unauthorized')));

    const props = {
      ...defaultProps,
      options: {
        ...defaultProps.options,
        jsonData: { baseURL: 'http://localhost:8080' },
        secureJsonData: { apiToken: 'invalid-token-12345' },
      },
    };

    render(<ConfigEditor {...props} />);

    // Step 1: connection success
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-connection-button'));
    });
    fireEvent.click(screen.getByTestId('next-to-auth-button'));

    // Step 2: auth fails
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-auth-button'));
    });
    expect(screen.getByTestId('auth-error')).toBeInTheDocument();

    // Confirm step should still be disabled
    const confirmStep = screen.getByTestId('wizard-step-2');
    expect(confirmStep).toBeDisabled();
  });
});

