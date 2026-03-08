import { NocoDBDataSource } from '../datasource';
import { NocoDBQuery, defaultQuery } from '../types';

// Mock @grafana/runtime
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({
    datasourceRequest: jest.fn().mockResolvedValue({ data: { results: {} } }),
  })),
  getTemplateSrv: jest.fn(() => ({
    replace: jest.fn((val: string) => val),
  })),
}));

describe('NocoDBDataSource', () => {
  let ds: NocoDBDataSource;

  beforeEach(() => {
    ds = new NocoDBDataSource({
      id: 1,
      uid: 'test-uid',
      type: 'yesoreyeram-nocodb-datasource',
      name: 'NocoDB',
      url: '',
      access: 'proxy',
      readOnly: false,
      jsonData: {
        baseURL: 'http://localhost:8080',
      },
      meta: {} as any,
    });
  });

  describe('constructor', () => {
    it('should set baseURL from instance settings', () => {
      expect(ds.baseURL).toBe('http://localhost:8080');
    });

    it('should default baseURL to empty string', () => {
      const dsNoUrl = new NocoDBDataSource({
        id: 1,
        uid: 'test-uid',
        type: 'yesoreyeram-nocodb-datasource',
        name: 'NocoDB',
        url: '',
        access: 'proxy',
        readOnly: false,
        jsonData: {} as any,
        meta: {} as any,
      });
      expect(dsNoUrl.baseURL).toBe('');
    });
  });

  describe('getDefaultQuery', () => {
    it('should return default query values', () => {
      const result = ds.getDefaultQuery();
      expect(result).toEqual(defaultQuery);
    });
  });

  describe('filterQuery', () => {
    it('should return true when tableID is set', () => {
      const query = { tableID: 'test-table' } as NocoDBQuery;
      expect(ds.filterQuery(query)).toBe(true);
    });

    it('should return false when tableID is empty', () => {
      const query = { tableID: '' } as NocoDBQuery;
      expect(ds.filterQuery(query)).toBe(false);
    });

    it('should return false when tableID is undefined', () => {
      const query = {} as NocoDBQuery;
      expect(ds.filterQuery(query)).toBe(false);
    });
  });

  describe('applyTemplateVariables', () => {
    it('should apply template variables to query fields', () => {
      const query: NocoDBQuery = {
        refId: 'A',
        tableID: 'table-$var',
        fields: 'field-$var',
        where: '(Name,eq,$var)',
        sort: '-$var',
        limit: 100,
        offset: 0,
      };

      const result = ds.applyTemplateVariables(query);
      expect(result.tableID).toBe('table-$var');
      expect(result.fields).toBe('field-$var');
      expect(result.where).toBe('(Name,eq,$var)');
      expect(result.sort).toBe('-$var');
    });
  });

  describe('testDatasource', () => {
    it('should return success on successful connection', async () => {
      const result = await ds.testDatasource();
      expect(result.status).toBe('success');
    });
  });
});
