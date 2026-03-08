import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigEditor } from '../components/ConfigEditor';

// Mock @grafana/ui components
jest.mock('@grafana/ui', () => ({
  InlineField: ({ children, label }: any) => (
    <div data-testid={`inline-field-${label}`}>
      <label>{label}</label>
      {children}
    </div>
  ),
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

  it('should render base URL input', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('nocodb-config-base-url')).toBeInTheDocument();
  });

  it('should render API token input', () => {
    render(<ConfigEditor {...defaultProps} />);
    expect(screen.getByTestId('nocodb-config-api-token')).toBeInTheDocument();
  });

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

  it('should call onOptionsChange when API token changes', () => {
    render(<ConfigEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-config-api-token');
    fireEvent.change(input, { target: { value: 'my-secret-token' } });

    expect(defaultProps.onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        secureJsonData: expect.objectContaining({
          apiToken: 'my-secret-token',
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
});
