package nocodb

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Client is a NocoDB API client.
type Client struct {
	baseURL    string
	apiToken   string
	httpClient *http.Client
}

// NewClient creates a new NocoDB API client.
func NewClient(baseURL, apiToken string) *Client {
	return &Client{
		baseURL:  baseURL,
		apiToken: apiToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// NewClientWithHTTPClient creates a new NocoDB API client with a custom HTTP client.
func NewClientWithHTTPClient(baseURL, apiToken string, httpClient *http.Client) *Client {
	return &Client{
		baseURL:    baseURL,
		apiToken:   apiToken,
		httpClient: httpClient,
	}
}

// ListRecordsResponse represents the response from the NocoDB list records API.
type ListRecordsResponse struct {
	List     []map[string]interface{} `json:"list"`
	PageInfo PageInfo                 `json:"pageInfo"`
}

// PageInfo contains pagination information.
type PageInfo struct {
	TotalRows int  `json:"totalRows"`
	Page      int  `json:"page"`
	PageSize  int  `json:"pageSize"`
	IsFirstPage bool `json:"isFirstPage"`
	IsLastPage  bool `json:"isLastPage"`
}

// ListRecordsOptions holds options for listing records.
type ListRecordsOptions struct {
	Fields string
	Where  string
	Sort   string
	Limit  int
	Offset int
}

// ListRecords retrieves records from a NocoDB table.
func (c *Client) ListRecords(ctx context.Context, tableID string, opts ListRecordsOptions) (*ListRecordsResponse, error) {
	if tableID == "" {
		return nil, fmt.Errorf("tableID is required")
	}

	endpoint := fmt.Sprintf("%s/api/v2/tables/%s/records", c.baseURL, url.PathEscape(tableID))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	q := req.URL.Query()
	if opts.Fields != "" {
		q.Set("fields", opts.Fields)
	}
	if opts.Where != "" {
		q.Set("where", opts.Where)
	}
	if opts.Sort != "" {
		q.Set("sort", opts.Sort)
	}
	if opts.Limit > 0 {
		q.Set("limit", strconv.Itoa(opts.Limit))
	}
	if opts.Offset > 0 {
		q.Set("offset", strconv.Itoa(opts.Offset))
	}
	req.URL.RawQuery = q.Encode()

	req.Header.Set("xc-token", c.apiToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	var result ListRecordsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return &result, nil
}

// HealthCheck verifies the connection to the NocoDB instance.
func (c *Client) HealthCheck(ctx context.Context) error {
	endpoint := fmt.Sprintf("%s/api/v1/health", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("creating health check request: %w", err)
	}

	req.Header.Set("xc-token", c.apiToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing health check: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("health check failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// CheckConnection verifies that the NocoDB instance is reachable (without auth).
func (c *Client) CheckConnection(ctx context.Context) error {
	endpoint := fmt.Sprintf("%s/api/v1/health", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("creating connection check request: %w", err)
	}

	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("connecting to NocoDB: %w", err)
	}
	defer resp.Body.Close()

	// Any response (even 401) means the server is reachable
	return nil
}

// ValidateAuth verifies that the API token is valid by calling an authenticated endpoint.
func (c *Client) ValidateAuth(ctx context.Context) error {
	endpoint := fmt.Sprintf("%s/api/v1/auth/user/me", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return fmt.Errorf("creating auth validation request: %w", err)
	}

	req.Header.Set("xc-token", c.apiToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("validating authentication: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("authentication failed: invalid API token")
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("auth validation failed with status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
