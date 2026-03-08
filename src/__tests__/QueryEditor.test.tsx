import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryEditor } from '../components/QueryEditor';
import { NocoDBQuery, defaultQuery } from '../types';

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
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      type={props.type || 'text'}
    />
  ),
}));

describe('QueryEditor', () => {
  const defaultProps = {
    query: {
      refId: 'A',
      tableID: '',
      fields: '',
      where: '',
      sort: '',
      limit: 100,
      offset: 0,
    } as NocoDBQuery,
    onChange: jest.fn(),
    onRunQuery: jest.fn(),
    datasource: {} as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all query fields', () => {
    render(<QueryEditor {...defaultProps} />);

    expect(screen.getByTestId('nocodb-query-table-id')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-query-fields')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-query-where')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-query-sort')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-query-limit')).toBeInTheDocument();
    expect(screen.getByTestId('nocodb-query-offset')).toBeInTheDocument();
  });

  it('should call onChange when table ID changes', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-table-id');
    fireEvent.change(input, { target: { value: 'my-table' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tableID: 'my-table' })
    );
  });

  it('should call onChange when fields change', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-fields');
    fireEvent.change(input, { target: { value: 'Name,Age' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fields: 'Name,Age' })
    );
  });

  it('should call onChange when where changes', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-where');
    fireEvent.change(input, { target: { value: '(Name,eq,test)' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ where: '(Name,eq,test)' })
    );
  });

  it('should call onChange when sort changes', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-sort');
    fireEvent.change(input, { target: { value: '-CreatedAt' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: '-CreatedAt' })
    );
  });

  it('should call onChange when limit changes', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-limit');
    fireEvent.change(input, { target: { value: '50' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('should call onChange when offset changes', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-offset');
    fireEvent.change(input, { target: { value: '10' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 10 })
    );
  });

  it('should call onRunQuery on blur', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-table-id');
    fireEvent.blur(input);

    expect(defaultProps.onRunQuery).toHaveBeenCalled();
  });

  it('should use default limit for invalid input', () => {
    render(<QueryEditor {...defaultProps} />);

    const input = screen.getByTestId('nocodb-query-limit');
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ limit: defaultQuery.limit })
    );
  });

  it('should display current query values', () => {
    const props = {
      ...defaultProps,
      query: {
        ...defaultProps.query,
        tableID: 'existing-table',
        fields: 'Name,Age',
        where: '(Active,eq,true)',
        sort: '-Name',
        limit: 50,
        offset: 10,
      },
    };

    render(<QueryEditor {...props} />);

    expect(screen.getByTestId('nocodb-query-table-id')).toHaveValue('existing-table');
    expect(screen.getByTestId('nocodb-query-fields')).toHaveValue('Name,Age');
    expect(screen.getByTestId('nocodb-query-where')).toHaveValue('(Active,eq,true)');
    expect(screen.getByTestId('nocodb-query-sort')).toHaveValue('-Name');
  });
});
