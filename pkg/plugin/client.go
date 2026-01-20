package plugin

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// NocoDBClient handles HTTP communication with NocoDB API
type NocoDBClient struct {
	baseURL    string
	apiToken   string
	httpClient *http.Client
	logger     log.Logger
}

// NewNocoDBClient creates a new NocoDB API client
func NewNocoDBClient(baseURL, apiToken string, timeout int, tlsSkipVerify bool) *NocoDBClient {
	// Ensure baseURL doesn't end with slash
	baseURL = strings.TrimSuffix(baseURL, "/")

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: tlsSkipVerify, // #nosec G402
		},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	}

	client := &http.Client{
		Timeout:   time.Duration(timeout) * time.Second,
		Transport: transport,
	}

	return &NocoDBClient{
		baseURL:    baseURL,
		apiToken:   apiToken,
		httpClient: client,
		logger:     log.DefaultLogger,
	}
}

// doRequest performs an HTTP request with authentication and error handling
func (c *NocoDBClient) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	// Build full URL
	fullURL := fmt.Sprintf("%s%s", c.baseURL, path)

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if c.apiToken != "" {
		req.Header.Set("xc-token", c.apiToken)
	}

	c.logger.Debug("NocoDB API request", "method", method, "url", fullURL)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for HTTP errors
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var nocoErr NocoDBError
		if err := json.Unmarshal(responseBody, &nocoErr); err == nil && nocoErr.Message != "" {
			return nil, &nocoErr
		}
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(responseBody))
	}

	return responseBody, nil
}

// CheckHealth verifies connectivity to NocoDB
func (c *NocoDBClient) CheckHealth(ctx context.Context) (*HealthResponse, error) {
	// Try to list projects to verify connectivity and authentication
	data, err := c.doRequest(ctx, http.MethodGet, "/api/v1/db/meta/projects", nil)
	if err != nil {
		return &HealthResponse{
			Status:  "error",
			Message: fmt.Sprintf("Failed to connect to NocoDB: %v", err),
		}, nil
	}

	var projects struct {
		List []NocoDBProject `json:"list"`
	}
	if err := json.Unmarshal(data, &projects); err != nil {
		return &HealthResponse{
			Status:  "error",
			Message: fmt.Sprintf("Failed to parse projects response: %v", err),
		}, nil
	}

	return &HealthResponse{
		Status:  "ok",
		Message: fmt.Sprintf("Successfully connected to NocoDB. Found %d project(s).", len(projects.List)),
	}, nil
}

// ListProjects retrieves all projects
func (c *NocoDBClient) ListProjects(ctx context.Context) ([]NocoDBProject, error) {
	data, err := c.doRequest(ctx, http.MethodGet, "/api/v1/db/meta/projects", nil)
	if err != nil {
		return nil, err
	}

	var response struct {
		List []NocoDBProject `json:"list"`
	}
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal projects: %w", err)
	}

	return response.List, nil
}

// ListTables retrieves all tables for a project
func (c *NocoDBClient) ListTables(ctx context.Context, projectID, baseID string) ([]NocoDBTable, error) {
	path := fmt.Sprintf("/api/v1/db/meta/projects/%s/tables", projectID)
	if baseID != "" {
		path = fmt.Sprintf("/api/v1/db/meta/bases/%s/tables", baseID)
	}

	data, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var response struct {
		List []NocoDBTable `json:"list"`
	}
	if err := json.Unmarshal(data, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal tables: %w", err)
	}

	return response.List, nil
}

// GetTableInfo retrieves detailed information about a table including columns
func (c *NocoDBClient) GetTableInfo(ctx context.Context, tableID string) (*NocoDBTable, error) {
	path := fmt.Sprintf("/api/v1/db/meta/tables/%s", tableID)

	data, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var table NocoDBTable
	if err := json.Unmarshal(data, &table); err != nil {
		return nil, fmt.Errorf("failed to unmarshal table info: %w", err)
	}

	return &table, nil
}

// QueryTable queries data from a table with filters, sorts, and pagination
func (c *NocoDBClient) QueryTable(ctx context.Context, projectID, tableName string, query *QueryModel) ([]map[string]interface{}, error) {
	// Build query parameters
	params := url.Values{}

	// Add column selection
	if len(query.Columns) > 0 {
		params.Set("fields", strings.Join(query.Columns, ","))
	}

	// Add filters
	if len(query.Filters) > 0 {
		where := c.buildWhereClause(query.Filters)
		if where != "" {
			params.Set("where", where)
		}
	}

	// Add sorting
	if len(query.Sorts) > 0 {
		sorts := make([]string, 0, len(query.Sorts))
		for _, sort := range query.Sorts {
			direction := ""
			if sort.Direction == SortDesc {
				direction = "-"
			}
			sorts = append(sorts, direction+sort.Column)
		}
		params.Set("sort", strings.Join(sorts, ","))
	}

	// Add pagination
	if query.Limit > 0 {
		params.Set("limit", fmt.Sprintf("%d", query.Limit))
	}
	if query.Offset > 0 {
		params.Set("offset", fmt.Sprintf("%d", query.Offset))
	}

	// Build path
	path := fmt.Sprintf("/api/v1/db/data/noco/%s/%s", projectID, tableName)
	if len(params) > 0 {
		path = fmt.Sprintf("%s?%s", path, params.Encode())
	}

	c.logger.Debug("Querying NocoDB table", "path", path)

	data, err := c.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}

	var response NocoDBListResponse
	if err := json.Unmarshal(data, &response); err != nil {
		// Try parsing as direct array (some endpoints return array directly)
		var directList []map[string]interface{}
		if err2 := json.Unmarshal(data, &directList); err2 == nil {
			return directList, nil
		}
		return nil, fmt.Errorf("failed to unmarshal query response: %w", err)
	}

	return response.List, nil
}

// buildWhereClause builds a where clause from filters
func (c *NocoDBClient) buildWhereClause(filters []NocoDBFilter) string {
	if len(filters) == 0 {
		return ""
	}

	conditions := make([]string, 0, len(filters))
	for _, filter := range filters {
		if filter.Column == "" {
			continue
		}

		var condition string
		switch filter.Operator {
		case FilterOpEQ:
			condition = fmt.Sprintf("(%s,eq,%v)", filter.Column, filter.Value)
		case FilterOpNEQ:
			condition = fmt.Sprintf("(%s,neq,%v)", filter.Column, filter.Value)
		case FilterOpGT:
			condition = fmt.Sprintf("(%s,gt,%v)", filter.Column, filter.Value)
		case FilterOpGTE:
			condition = fmt.Sprintf("(%s,gte,%v)", filter.Column, filter.Value)
		case FilterOpLT:
			condition = fmt.Sprintf("(%s,lt,%v)", filter.Column, filter.Value)
		case FilterOpLTE:
			condition = fmt.Sprintf("(%s,lte,%v)", filter.Column, filter.Value)
		case FilterOpLike:
			condition = fmt.Sprintf("(%s,like,%v)", filter.Column, filter.Value)
		case FilterOpNLike:
			condition = fmt.Sprintf("(%s,nlike,%v)", filter.Column, filter.Value)
		case FilterOpIsNull:
			condition = fmt.Sprintf("(%s,is,null)", filter.Column)
		case FilterOpIsNotNull:
			condition = fmt.Sprintf("(%s,not,null)", filter.Column)
		default:
			c.logger.Warn("Unsupported filter operator", "operator", filter.Operator)
			continue
		}

		if condition != "" {
			conditions = append(conditions, condition)
		}
	}

	if len(conditions) == 0 {
		return ""
	}

	// Join conditions with logical operators (default to AND)
	return strings.Join(conditions, "~and")
}

// ExecuteSQL executes a raw SQL query (if supported by NocoDB version)
func (c *NocoDBClient) ExecuteSQL(ctx context.Context, projectID, baseID, sqlQuery string) ([]map[string]interface{}, error) {
	// Note: Raw SQL execution might require specific NocoDB configuration
	// This is a placeholder for SQL execution functionality
	path := fmt.Sprintf("/api/v1/db/meta/projects/%s/bases/%s/sql", projectID, baseID)

	payload := map[string]interface{}{
		"sql": sqlQuery,
	}

	data, err := c.doRequest(ctx, http.MethodPost, path, payload)
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal SQL response: %w", err)
	}

	return result, nil
}
