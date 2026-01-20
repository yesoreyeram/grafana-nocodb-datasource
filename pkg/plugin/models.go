package plugin

import (
	"encoding/json"
	"time"
)

// QueryType represents the type of query
type QueryType string

const (
	QueryTypeTable QueryType = "table"
	QueryTypeSQL   QueryType = "sql"
)

// FilterOperator represents filter operators
type FilterOperator string

const (
	FilterOpEQ         FilterOperator = "eq"
	FilterOpNEQ        FilterOperator = "neq"
	FilterOpGT         FilterOperator = "gt"
	FilterOpGTE        FilterOperator = "gte"
	FilterOpLT         FilterOperator = "lt"
	FilterOpLTE        FilterOperator = "lte"
	FilterOpLike       FilterOperator = "like"
	FilterOpNLike      FilterOperator = "nlike"
	FilterOpIsNull     FilterOperator = "is null"
	FilterOpIsNotNull  FilterOperator = "is not null"
	FilterOpIn         FilterOperator = "in"
	FilterOpNotIn      FilterOperator = "not in"
	FilterOpBetween    FilterOperator = "between"
)

// SortDirection represents sort direction
type SortDirection string

const (
	SortAsc  SortDirection = "asc"
	SortDesc SortDirection = "desc"
)

// NocoDBFilter represents a filter condition
type NocoDBFilter struct {
	Column          string         `json:"column"`
	Operator        FilterOperator `json:"operator"`
	Value           interface{}    `json:"value"`
	LogicalOperator string         `json:"logicalOperator,omitempty"`
}

// NocoDBSort represents a sort configuration
type NocoDBSort struct {
	Column    string        `json:"column"`
	Direction SortDirection `json:"direction"`
}

// Aggregation represents an aggregation configuration
type Aggregation struct {
	Type   string `json:"type"`
	Column string `json:"column"`
}

// QueryModel represents the data query model from frontend
type QueryModel struct {
	QueryType     QueryType        `json:"queryType"`
	TableName     string           `json:"tableName,omitempty"`
	ProjectID     string           `json:"projectId,omitempty"`
	BaseID        string           `json:"baseId,omitempty"`
	Columns       []string         `json:"columns,omitempty"`
	Filters       []NocoDBFilter   `json:"filters,omitempty"`
	Sorts         []NocoDBSort     `json:"sorts,omitempty"`
	Limit         int              `json:"limit,omitempty"`
	Offset        int              `json:"offset,omitempty"`
	RawSQL        string           `json:"rawSQL,omitempty"`
	TimeColumn    string           `json:"timeColumn,omitempty"`
	ValueColumns  []string         `json:"valueColumns,omitempty"`
	GroupBy       []string         `json:"groupBy,omitempty"`
	Aggregation   *Aggregation     `json:"aggregation,omitempty"`
	UseCache      bool             `json:"useCache,omitempty"`
	CacheDuration int              `json:"cacheDuration,omitempty"`
}

// DataSourceOptions represents datasource configuration
type DataSourceOptions struct {
	URL                    string `json:"url"`
	ProjectID              string `json:"projectId,omitempty"`
	BaseID                 string `json:"baseId,omitempty"`
	Timeout                int    `json:"timeout,omitempty"`
	TLSSkipVerify          bool   `json:"tlsSkipVerify,omitempty"`
	MaxRequestsPerSecond   int    `json:"maxRequestsPerSecond,omitempty"`
	DefaultLimit           int    `json:"defaultLimit,omitempty"`
	MaxLimit               int    `json:"maxLimit,omitempty"`
	EnableCache            bool   `json:"enableCache,omitempty"`
	DefaultCacheDuration   int    `json:"defaultCacheDuration,omitempty"`
}

// SecureData represents secure configuration stored encrypted
type SecureData struct {
	APIToken string `json:"apiToken"`
}

// NocoDBProject represents a NocoDB project
type NocoDBProject struct {
	ID    string          `json:"id"`
	Title string          `json:"title"`
	Bases []NocoDBBase    `json:"bases,omitempty"`
}

// NocoDBBase represents a NocoDB base
type NocoDBBase struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`
	Alias     string `json:"alias,omitempty"`
	Type      string `json:"type"`
	Enabled   bool   `json:"enabled"`
}

// NocoDBTable represents a NocoDB table
type NocoDBTable struct {
	ID        string          `json:"id"`
	Title     string          `json:"title"`
	TableName string          `json:"table_name"`
	Type      string          `json:"type"`
	Enabled   bool            `json:"enabled"`
	Columns   []NocoDBColumn  `json:"columns,omitempty"`
}

// NocoDBColumn represents a NocoDB column
type NocoDBColumn struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	ColumnName string `json:"column_name"`
	UIDT       string `json:"uidt"` // UI Data Type
	DT         string `json:"dt"`   // Database Type
	NP         string `json:"np,omitempty"` // Numeric Precision
	NS         string `json:"ns,omitempty"` // Numeric Scale
	PK         bool   `json:"pk,omitempty"` // Primary Key
	AI         bool   `json:"ai,omitempty"` // Auto Increment
	Required   bool   `json:"rqd,omitempty"` // Required
	Unsigned   bool   `json:"un,omitempty"` // Unsigned
	System     bool   `json:"system,omitempty"`
}

// NocoDBListResponse represents a list response from NocoDB API
type NocoDBListResponse struct {
	List     []map[string]interface{} `json:"list"`
	PageInfo PageInfo                 `json:"pageInfo"`
}

// PageInfo represents pagination information
type PageInfo struct {
	TotalRows   *int  `json:"totalRows,omitempty"`
	Page        *int  `json:"page,omitempty"`
	PageSize    *int  `json:"pageSize,omitempty"`
	IsFirstPage *bool `json:"isFirstPage,omitempty"`
	IsLastPage  *bool `json:"isLastPage,omitempty"`
}

// NocoDBError represents an error response from NocoDB API
type NocoDBError struct {
	Message string                 `json:"message"`
	Code    string                 `json:"code,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

func (e *NocoDBError) Error() string {
	return e.Message
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Version string `json:"version,omitempty"`
}

// CacheEntry represents a cached query result
type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// IsExpired checks if the cache entry is expired
func (c *CacheEntry) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}

// ParseSecureData parses secure JSON data
func ParseSecureData(data map[string]string) (*SecureData, error) {
	sd := &SecureData{}
	if token, ok := data["apiToken"]; ok {
		sd.APIToken = token
	}
	return sd, nil
}

// ParseDataSourceOptions parses datasource options from JSON data
func ParseDataSourceOptions(jsonData []byte) (*DataSourceOptions, error) {
	opts := &DataSourceOptions{
		Timeout:              30,
		DefaultLimit:         1000,
		MaxLimit:             10000,
		EnableCache:          true,
		DefaultCacheDuration: 300,
	}

	if len(jsonData) > 0 {
		if err := json.Unmarshal(jsonData, opts); err != nil {
			return nil, err
		}
	}

	return opts, nil
}
