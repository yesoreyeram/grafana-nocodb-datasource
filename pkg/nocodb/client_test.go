package nocodb

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClient(t *testing.T) {
	client := NewClient("http://localhost:8080", "test-token")
	assert.NotNil(t, client)
	assert.Equal(t, "http://localhost:8080", client.baseURL)
	assert.Equal(t, "test-token", client.apiToken)
	assert.NotNil(t, client.httpClient)
}

func TestListRecords(t *testing.T) {
	t.Run("successful request", func(t *testing.T) {
		expected := ListRecordsResponse{
			List: []map[string]interface{}{
				{"Id": float64(1), "Title": "Test Record"},
				{"Id": float64(2), "Title": "Another Record"},
			},
			PageInfo: PageInfo{
				TotalRows:   2,
				Page:        1,
				PageSize:    25,
				IsFirstPage: true,
				IsLastPage:  true,
			},
		}

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, http.MethodGet, r.Method)
			assert.Equal(t, "/api/v2/tables/test-table-id/records", r.URL.Path)
			assert.Equal(t, "test-token", r.Header.Get("xc-token"))
			assert.Equal(t, "application/json", r.Header.Get("Accept"))

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(expected)
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		result, err := client.ListRecords(context.Background(), "test-table-id", ListRecordsOptions{})

		require.NoError(t, err)
		assert.Len(t, result.List, 2)
		assert.Equal(t, "Test Record", result.List[0]["Title"])
		assert.Equal(t, 2, result.PageInfo.TotalRows)
	})

	t.Run("with query parameters", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, "Name", r.URL.Query().Get("fields"))
			assert.Equal(t, "(Name,eq,test)", r.URL.Query().Get("where"))
			assert.Equal(t, "-CreatedAt", r.URL.Query().Get("sort"))
			assert.Equal(t, "10", r.URL.Query().Get("limit"))
			assert.Equal(t, "5", r.URL.Query().Get("offset"))

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(ListRecordsResponse{})
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		_, err := client.ListRecords(context.Background(), "test-table-id", ListRecordsOptions{
			Fields: "Name",
			Where:  "(Name,eq,test)",
			Sort:   "-CreatedAt",
			Limit:  10,
			Offset: 5,
		})

		require.NoError(t, err)
	})

	t.Run("empty table ID", func(t *testing.T) {
		client := NewClient("http://localhost:8080", "test-token")
		_, err := client.ListRecords(context.Background(), "", ListRecordsOptions{})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "tableID is required")
	})

	t.Run("server error", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal server error"}`))
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		_, err := client.ListRecords(context.Background(), "test-table-id", ListRecordsOptions{})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unexpected status code 500")
	})

	t.Run("invalid JSON response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`invalid json`))
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		_, err := client.ListRecords(context.Background(), "test-table-id", ListRecordsOptions{})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "decoding response")
	})
}

func TestHealthCheck(t *testing.T) {
	t.Run("successful health check", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, http.MethodGet, r.Method)
			assert.Equal(t, "/api/v1/health", r.URL.Path)
			assert.Equal(t, "test-token", r.Header.Get("xc-token"))

			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		err := client.HealthCheck(context.Background())

		require.NoError(t, err)
	})

	t.Run("failed health check", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"unauthorized"}`))
		}))
		defer server.Close()

		client := NewClientWithHTTPClient(server.URL, "test-token", server.Client())
		err := client.HealthCheck(context.Background())

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "health check failed with status 401")
	})

	t.Run("connection error", func(t *testing.T) {
		client := NewClient("http://localhost:1", "test-token")
		err := client.HealthCheck(context.Background())

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "executing health check")
	})
}
