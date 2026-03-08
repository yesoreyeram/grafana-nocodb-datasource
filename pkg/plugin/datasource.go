package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"

	"github.com/yesoreyeram/grafana-nocodb-datasource/pkg/models"
	"github.com/yesoreyeram/grafana-nocodb-datasource/pkg/nocodb"
)

var _ backend.QueryDataHandler = (*Datasource)(nil)
var _ backend.CheckHealthHandler = (*Datasource)(nil)

// Datasource is the NocoDB datasource plugin implementation.
type Datasource struct {
	client *nocodb.Client
	logger log.Logger
}

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var s models.NocoDBSettings
	if err := json.Unmarshal(settings.JSONData, &s); err != nil {
		return nil, fmt.Errorf("unmarshalling settings: %w", err)
	}

	apiToken := settings.DecryptedSecureJSONData["apiToken"]
	if apiToken == "" {
		return nil, fmt.Errorf("API token is required")
	}

	if s.BaseURL == "" {
		return nil, fmt.Errorf("base URL is required")
	}

	client := nocodb.NewClient(s.BaseURL, apiToken)

	return &Datasource{
		client: client,
		logger: log.DefaultLogger,
	}, nil
}

// Dispose cleans up the datasource resources.
func (d *Datasource) Dispose() {}

// QueryData handles multiple queries.
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var qm models.NocoDBQuery
	if err := json.Unmarshal(query.JSON, &qm); err != nil {
		return backend.DataResponse{Error: fmt.Errorf("unmarshalling query: %w", err)}
	}

	if qm.TableID == "" {
		return backend.DataResponse{Error: fmt.Errorf("tableID is required")}
	}

	opts := nocodb.ListRecordsOptions{
		Fields: qm.Fields,
		Where:  qm.Where,
		Sort:   qm.Sort,
		Limit:  qm.Limit,
		Offset: qm.Offset,
	}

	result, err := d.client.ListRecords(ctx, qm.TableID, opts)
	if err != nil {
		return backend.DataResponse{Error: fmt.Errorf("querying NocoDB: %w", err)}
	}

	frame := d.recordsToFrame(result.List, query.RefID)
	return backend.DataResponse{Frames: data.Frames{frame}}
}

// recordsToFrame converts NocoDB records to a Grafana data frame.
func (d *Datasource) recordsToFrame(records []map[string]interface{}, refID string) *data.Frame {
	frame := data.NewFrame(refID)

	if len(records) == 0 {
		return frame
	}

	// Collect all unique field names from all records
	fieldOrder := make([]string, 0)
	fieldSeen := make(map[string]bool)
	for _, record := range records {
		for key := range record {
			if !fieldSeen[key] {
				fieldSeen[key] = true
				fieldOrder = append(fieldOrder, key)
			}
		}
	}

	// Build columns based on field types from first non-nil value
	for _, fieldName := range fieldOrder {
		var field *data.Field

		// Find first non-nil value to determine type
		var sampleValue interface{}
		for _, record := range records {
			if v, ok := record[fieldName]; ok && v != nil {
				sampleValue = v
				break
			}
		}

		switch sampleValue.(type) {
		case float64:
			values := make([]*float64, len(records))
			for i, record := range records {
				if v, ok := record[fieldName]; ok && v != nil {
					f := v.(float64)
					values[i] = &f
				}
			}
			field = data.NewField(fieldName, nil, values)
		case bool:
			values := make([]*bool, len(records))
			for i, record := range records {
				if v, ok := record[fieldName]; ok && v != nil {
					b := v.(bool)
					values[i] = &b
				}
			}
			field = data.NewField(fieldName, nil, values)
		default:
			values := make([]*string, len(records))
			for i, record := range records {
				if v, ok := record[fieldName]; ok && v != nil {
					s := fmt.Sprintf("%v", v)
					// Try to parse as time for common date fields
					if isTimeField(fieldName) {
						if _, err := time.Parse(time.RFC3339, s); err == nil {
							// Will be handled as a string; Grafana auto-detects time fields
						}
					}
					values[i] = &s
				}
			}
			field = data.NewField(fieldName, nil, values)
		}

		frame.Fields = append(frame.Fields, field)
	}

	return frame
}

// isTimeField checks if a field name suggests it contains time data.
func isTimeField(name string) bool {
	timeFields := []string{"created_at", "updated_at", "CreatedAt", "UpdatedAt", "nc_created_at", "nc_updated_at"}
	for _, tf := range timeFields {
		if name == tf {
			return true
		}
	}
	return false
}

// CheckHealth handles health check requests.
func (d *Datasource) CheckHealth(ctx context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	err := d.client.HealthCheck(ctx)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: fmt.Sprintf("Failed to connect to NocoDB: %s", err.Error()),
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Successfully connected to NocoDB",
	}, nil
}
