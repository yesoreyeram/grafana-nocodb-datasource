package models

// NocoDBSettings holds the datasource configuration settings.
type NocoDBSettings struct {
	BaseURL string `json:"baseURL"`
}

// NocoDBQuery represents a query to be executed against NocoDB.
type NocoDBQuery struct {
	TableID string `json:"tableID"`
	Fields  string `json:"fields"`
	Where   string `json:"where"`
	Sort    string `json:"sort"`
	Limit   int    `json:"limit"`
	Offset  int    `json:"offset"`
}
