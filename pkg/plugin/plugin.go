package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// Make sure NocoDBDatasource implements required interfaces
var (
	_ backend.QueryDataHandler      = (*NocoDBDatasource)(nil)
	_ backend.CheckHealthHandler    = (*NocoDBDatasource)(nil)
	_ backend.CallResourceHandler   = (*NocoDBDatasource)(nil)
	_ instancemgmt.InstanceDisposer = (*NocoDBDatasource)(nil)
)

// NocoDBDatasource represents a NocoDB datasource instance
type NocoDBDatasource struct {
	client  *NocoDBClient
	options *DataSourceOptions
	cache   map[string]*CacheEntry
	cacheMu sync.RWMutex
	logger  log.Logger
}

// NewNocoDBDatasource creates a new NocoDB datasource instance
func NewNocoDBDatasource(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	logger := log.DefaultLogger.With("datasource", "nocodb", "uid", settings.UID)

	// Parse datasource options
	opts, err := ParseDataSourceOptions(settings.JSONData)
	if err != nil {
		logger.Error("Failed to parse datasource options", "error", err)
		return nil, fmt.Errorf("failed to parse datasource options: %w", err)
	}

	// Validate URL
	if opts.URL == "" {
		return nil, fmt.Errorf("NocoDB URL is required")
	}

	// Parse secure data (API token)
	secureData, err := ParseSecureData(settings.DecryptedSecureJSONData)
	if err != nil {
		logger.Error("Failed to parse secure data", "error", err)
		return nil, fmt.Errorf("failed to parse secure data: %w", err)
	}

	// Validate API token
	if secureData.APIToken == "" {
		return nil, fmt.Errorf("API token is required")
	}

	// Create NocoDB client
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 30
	}

	client := NewNocoDBClient(opts.URL, secureData.APIToken, timeout, opts.TLSSkipVerify)

	logger.Info("NocoDB datasource instance created", "url", opts.URL)

	return &NocoDBDatasource{
		client:  client,
		options: opts,
		cache:   make(map[string]*CacheEntry),
		logger:  logger,
	}, nil
}

// Dispose cleans up resources when datasource instance is disposed
func (d *NocoDBDatasource) Dispose() {
	d.logger.Info("Disposing NocoDB datasource instance")

	// Clear cache
	d.cacheMu.Lock()
	d.cache = make(map[string]*CacheEntry)
	d.cacheMu.Unlock()
}

// QueryData handles data queries from Grafana
func (d *NocoDBDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	d.logger.Debug("QueryData called", "queries", len(req.Queries))

	response := backend.NewQueryDataResponse()

	// Process each query
	for _, q := range req.Queries {
		res := d.processQuery(ctx, q)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

// processQuery processes a single query
func (d *NocoDBDatasource) processQuery(ctx context.Context, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	// Parse query model
	var qm QueryModel
	if err := json.Unmarshal(query.JSON, &qm); err != nil {
		d.logger.Error("Failed to unmarshal query", "error", err)
		response.Error = fmt.Errorf("failed to parse query: %w", err)
		return response
	}

	// Set defaults
	if qm.Limit <= 0 {
		qm.Limit = d.options.DefaultLimit
	}
	if qm.Limit > d.options.MaxLimit {
		qm.Limit = d.options.MaxLimit
	}

	// Check cache if enabled
	cacheKey := d.getCacheKey(&qm, query.TimeRange)
	if qm.UseCache && d.options.EnableCache {
		if cachedData := d.getFromCache(cacheKey); cachedData != nil {
			d.logger.Debug("Returning cached data", "refID", query.RefID)
			response.Frames = cachedData.Data.([]*data.Frame)
			return response
		}
	}

	// Execute query based on type
	var result []map[string]interface{}
	var err error

	switch qm.QueryType {
	case QueryTypeTable:
		result, err = d.executeTableQuery(ctx, &qm)
	case QueryTypeSQL:
		result, err = d.executeSQLQuery(ctx, &qm)
	default:
		err = fmt.Errorf("unsupported query type: %s", qm.QueryType)
	}

	if err != nil {
		d.logger.Error("Query execution failed", "error", err, "refID", query.RefID)
		response.Error = err
		return response
	}

	// Convert result to data frames
	frames, err := d.convertToDataFrames(result, &qm, query.RefID)
	if err != nil {
		d.logger.Error("Failed to convert to data frames", "error", err)
		response.Error = fmt.Errorf("failed to convert data: %w", err)
		return response
	}

	response.Frames = frames

	// Cache the result if enabled
	if qm.UseCache && d.options.EnableCache {
		cacheDuration := qm.CacheDuration
		if cacheDuration <= 0 {
			cacheDuration = d.options.DefaultCacheDuration
		}
		d.setCache(cacheKey, frames, cacheDuration)
	}

	return response
}

// executeTableQuery executes a table-based query
func (d *NocoDBDatasource) executeTableQuery(ctx context.Context, qm *QueryModel) ([]map[string]interface{}, error) {
	if qm.TableName == "" {
		return nil, fmt.Errorf("table name is required")
	}

	projectID := qm.ProjectID
	if projectID == "" {
		projectID = d.options.ProjectID
	}
	if projectID == "" {
		return nil, fmt.Errorf("project ID is required")
	}

	d.logger.Debug("Executing table query", "table", qm.TableName, "project", projectID)

	return d.client.QueryTable(ctx, projectID, qm.TableName, qm)
}

// executeSQLQuery executes a raw SQL query
func (d *NocoDBDatasource) executeSQLQuery(ctx context.Context, qm *QueryModel) ([]map[string]interface{}, error) {
	if qm.RawSQL == "" {
		return nil, fmt.Errorf("SQL query is required")
	}

	projectID := qm.ProjectID
	if projectID == "" {
		projectID = d.options.ProjectID
	}
	if projectID == "" {
		return nil, fmt.Errorf("project ID is required")
	}

	baseID := qm.BaseID
	if baseID == "" {
		baseID = d.options.BaseID
	}
	if baseID == "" {
		return nil, fmt.Errorf("base ID is required for SQL queries")
	}

	d.logger.Debug("Executing SQL query", "project", projectID, "base", baseID)

	// Validate SQL to prevent dangerous operations
	if err := validateSQL(qm.RawSQL); err != nil {
		return nil, fmt.Errorf("SQL validation failed: %w", err)
	}

	return d.client.ExecuteSQL(ctx, projectID, baseID, qm.RawSQL)
}

// CheckHealth handles health check requests
func (d *NocoDBDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	d.logger.Info("CheckHealth called")

	healthResp, err := d.client.CheckHealth(ctx)
	if err != nil {
		d.logger.Error("Health check failed", "error", err)
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Health check failed: %v", err),
		}, nil
	}

	status := backend.HealthStatusOk
	if healthResp.Status != "ok" {
		status = backend.HealthStatusError
	}

	return &backend.CheckHealthResult{
		Status:  status,
		Message: healthResp.Message,
	}, nil
}

// CallResource handles resource calls for dynamic data (e.g., fetching tables, projects)
func (d *NocoDBDatasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	d.logger.Debug("CallResource called", "path", req.Path)

	switch req.Path {
	case "projects":
		return d.handleListProjects(ctx, sender)
	case "tables":
		return d.handleListTables(ctx, req, sender)
	default:
		return sender.Send(&backend.CallResourceResponse{
			Status: 404,
			Body:   []byte(`{"error": "resource not found"}`),
		})
	}
}

// handleListProjects handles listing projects
func (d *NocoDBDatasource) handleListProjects(ctx context.Context, sender backend.CallResourceResponseSender) error {
	projects, err := d.client.ListProjects(ctx)
	if err != nil {
		d.logger.Error("Failed to list projects", "error", err)
		return sender.Send(&backend.CallResourceResponse{
			Status: 500,
			Body:   []byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())),
		})
	}

	data, err := json.Marshal(projects)
	if err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: 500,
			Body:   []byte(`{"error": "failed to marshal response"}`),
		})
	}

	return sender.Send(&backend.CallResourceResponse{
		Status: 200,
		Body:   data,
	})
}

// handleListTables handles listing tables for a project
func (d *NocoDBDatasource) handleListTables(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	projectID := req.URL.Query().Get("projectId")
	baseID := req.URL.Query().Get("baseId")

	if projectID == "" && d.options.ProjectID != "" {
		projectID = d.options.ProjectID
	}

	if projectID == "" {
		return sender.Send(&backend.CallResourceResponse{
			Status: 400,
			Body:   []byte(`{"error": "projectId is required"}`),
		})
	}

	tables, err := d.client.ListTables(ctx, projectID, baseID)
	if err != nil {
		d.logger.Error("Failed to list tables", "error", err, "projectId", projectID)
		return sender.Send(&backend.CallResourceResponse{
			Status: 500,
			Body:   []byte(fmt.Sprintf(`{"error": "%s"}`, err.Error())),
		})
	}

	data, err := json.Marshal(tables)
	if err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: 500,
			Body:   []byte(`{"error": "failed to marshal response"}`),
		})
	}

	return sender.Send(&backend.CallResourceResponse{
		Status: 200,
		Body:   data,
	})
}

// getCacheKey generates a cache key for a query
func (d *NocoDBDatasource) getCacheKey(qm *QueryModel, timeRange backend.TimeRange) string {
	data, _ := json.Marshal(map[string]interface{}{
		"query":     qm,
		"timeRange": timeRange,
	})
	return string(data)
}

// getFromCache retrieves data from cache
func (d *NocoDBDatasource) getFromCache(key string) *CacheEntry {
	d.cacheMu.RLock()
	defer d.cacheMu.RUnlock()

	entry, ok := d.cache[key]
	if !ok || entry.IsExpired() {
		return nil
	}

	return entry
}

// setCache stores data in cache
func (d *NocoDBDatasource) setCache(key string, data interface{}, duration int) {
	d.cacheMu.Lock()
	defer d.cacheMu.Unlock()

	d.cache[key] = &CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(time.Duration(duration) * time.Second),
	}

	// Clean up expired entries periodically
	if len(d.cache) > 1000 {
		go d.cleanExpiredCache()
	}
}

// cleanExpiredCache removes expired cache entries
func (d *NocoDBDatasource) cleanExpiredCache() {
	d.cacheMu.Lock()
	defer d.cacheMu.Unlock()

	now := time.Now()
	for key, entry := range d.cache {
		if now.After(entry.ExpiresAt) {
			delete(d.cache, key)
		}
	}
}
