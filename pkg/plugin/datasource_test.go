package plugin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yesoreyeram/grafana-nocodb-datasource/pkg/nocodb"
)

func TestNewDatasource(t *testing.T) {
	t.Run("valid settings", func(t *testing.T) {
		settings := backend.DataSourceInstanceSettings{
			JSONData:               json.RawMessage(`{"baseURL":"http://localhost:8080"}`),
			DecryptedSecureJSONData: map[string]string{"apiToken": "test-token"},
		}

		instance, err := NewDatasource(context.Background(), settings)
		require.NoError(t, err)
		assert.NotNil(t, instance)
	})

	t.Run("missing API token", func(t *testing.T) {
		settings := backend.DataSourceInstanceSettings{
			JSONData:               json.RawMessage(`{"baseURL":"http://localhost:8080"}`),
			DecryptedSecureJSONData: map[string]string{},
		}

		_, err := NewDatasource(context.Background(), settings)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "API token is required")
	})

	t.Run("missing base URL", func(t *testing.T) {
		settings := backend.DataSourceInstanceSettings{
			JSONData:               json.RawMessage(`{}`),
			DecryptedSecureJSONData: map[string]string{"apiToken": "test-token"},
		}

		_, err := NewDatasource(context.Background(), settings)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "base URL is required")
	})

	t.Run("invalid JSON", func(t *testing.T) {
		settings := backend.DataSourceInstanceSettings{
			JSONData:               json.RawMessage(`invalid`),
			DecryptedSecureJSONData: map[string]string{"apiToken": "test-token"},
		}

		_, err := NewDatasource(context.Background(), settings)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unmarshalling settings")
	})
}

func newTestDatasource(t *testing.T, serverURL string) *Datasource {
	t.Helper()
	return &Datasource{
		client: nocodb.NewClient(serverURL, "test-token"),
	}
}

func TestQueryData(t *testing.T) {
	t.Run("successful query", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nocodb.ListRecordsResponse{
				List: []map[string]interface{}{
					{"Id": float64(1), "Name": "Alice", "Age": float64(30)},
					{"Id": float64(2), "Name": "Bob", "Age": float64(25)},
				},
				PageInfo: nocodb.PageInfo{TotalRows: 2},
			})
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		queryJSON, _ := json.Marshal(map[string]interface{}{
			"tableID": "test-table",
		})

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  queryJSON,
				},
			},
		})

		require.NoError(t, err)
		assert.Len(t, resp.Responses, 1)

		result := resp.Responses["A"]
		assert.NoError(t, result.Error)
		assert.Len(t, result.Frames, 1)

		frame := result.Frames[0]
		assert.Equal(t, "A", frame.Name)
		assert.Equal(t, 3, len(frame.Fields))
		assert.Equal(t, 2, frame.Fields[0].Len())
	})

	t.Run("missing table ID", func(t *testing.T) {
		ds := newTestDatasource(t, "http://localhost:1")

		queryJSON, _ := json.Marshal(map[string]interface{}{})

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  queryJSON,
				},
			},
		})

		require.NoError(t, err)
		assert.Error(t, resp.Responses["A"].Error)
		assert.Contains(t, resp.Responses["A"].Error.Error(), "tableID is required")
	})

	t.Run("invalid query JSON", func(t *testing.T) {
		ds := newTestDatasource(t, "http://localhost:1")

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  json.RawMessage(`invalid`),
				},
			},
		})

		require.NoError(t, err)
		assert.Error(t, resp.Responses["A"].Error)
		assert.Contains(t, resp.Responses["A"].Error.Error(), "unmarshalling query")
	})

	t.Run("empty records", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nocodb.ListRecordsResponse{
				List: []map[string]interface{}{},
			})
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		queryJSON, _ := json.Marshal(map[string]interface{}{
			"tableID": "test-table",
		})

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  queryJSON,
				},
			},
		})

		require.NoError(t, err)
		result := resp.Responses["A"]
		assert.NoError(t, result.Error)
		assert.Len(t, result.Frames, 1)
		assert.Equal(t, 0, len(result.Frames[0].Fields))
	})

	t.Run("records with boolean values", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nocodb.ListRecordsResponse{
				List: []map[string]interface{}{
					{"Id": float64(1), "Active": true},
					{"Id": float64(2), "Active": false},
				},
			})
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		queryJSON, _ := json.Marshal(map[string]interface{}{
			"tableID": "test-table",
		})

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  queryJSON,
				},
			},
		})

		require.NoError(t, err)
		result := resp.Responses["A"]
		assert.NoError(t, result.Error)
		assert.Len(t, result.Frames, 1)
	})

	t.Run("records with nil values", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nocodb.ListRecordsResponse{
				List: []map[string]interface{}{
					{"Id": float64(1), "Name": "Alice"},
					{"Id": float64(2), "Name": nil},
				},
			})
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		queryJSON, _ := json.Marshal(map[string]interface{}{
			"tableID": "test-table",
		})

		resp, err := ds.QueryData(context.Background(), &backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID: "A",
					JSON:  queryJSON,
				},
			},
		})

		require.NoError(t, err)
		result := resp.Responses["A"]
		assert.NoError(t, result.Error)
	})
}

func TestCheckHealth(t *testing.T) {
	t.Run("healthy", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		result, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{})
		require.NoError(t, err)
		assert.Equal(t, backend.HealthStatusOk, result.Status)
		assert.Equal(t, "Successfully connected to NocoDB", result.Message)
	})

	t.Run("unhealthy", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"unauthorized"}`))
		}))
		defer server.Close()

		ds := newTestDatasource(t, server.URL)

		result, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{})
		require.NoError(t, err)
		assert.Equal(t, backend.HealthStatusError, result.Status)
		assert.Contains(t, result.Message, "Failed to connect to NocoDB")
	})
}

func TestRecordsToFrame(t *testing.T) {
	ds := &Datasource{}

	t.Run("empty records", func(t *testing.T) {
		frame := ds.recordsToFrame([]map[string]interface{}{}, "test")
		assert.Equal(t, "test", frame.Name)
		assert.Equal(t, 0, len(frame.Fields))
	})

	t.Run("mixed types", func(t *testing.T) {
		records := []map[string]interface{}{
			{"id": float64(1), "name": "test", "active": true},
		}
		frame := ds.recordsToFrame(records, "test")
		assert.Equal(t, 3, len(frame.Fields))
	})
}

func TestIsTimeField(t *testing.T) {
	assert.True(t, isTimeField("created_at"))
	assert.True(t, isTimeField("updated_at"))
	assert.True(t, isTimeField("CreatedAt"))
	assert.True(t, isTimeField("UpdatedAt"))
	assert.True(t, isTimeField("nc_created_at"))
	assert.True(t, isTimeField("nc_updated_at"))
	assert.False(t, isTimeField("name"))
	assert.False(t, isTimeField("id"))
}
