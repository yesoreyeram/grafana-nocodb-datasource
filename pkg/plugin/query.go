package plugin

import (
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// convertToDataFrames converts NocoDB query results to Grafana data frames
func (d *NocoDBDatasource) convertToDataFrames(results []map[string]interface{}, qm *QueryModel, refID string) ([]*data.Frame, error) {
	if len(results) == 0 {
		// Return empty frame
		frame := data.NewFrame(refID)
		return []*data.Frame{frame}, nil
	}

	// Determine frame structure based on query configuration
	if qm.TimeColumn != "" {
		// Time series data
		return d.convertToTimeSeriesFrames(results, qm, refID)
	}

	// Table data
	return d.convertToTableFrames(results, qm, refID)
}

// convertToTimeSeriesFrames converts results to time series data frames
func (d *NocoDBDatasource) convertToTimeSeriesFrames(results []map[string]interface{}, qm *QueryModel, refID string) ([]*data.Frame, error) {
	if qm.TimeColumn == "" {
		return nil, fmt.Errorf("time column is required for time series")
	}

	// Group by value columns
	valueColumns := qm.ValueColumns
	if len(valueColumns) == 0 {
		// Use all numeric columns except time column
		for key := range results[0] {
			if key != qm.TimeColumn {
				valueColumns = append(valueColumns, key)
			}
		}
	}

	// Create frame for each value column
	frames := make([]*data.Frame, 0, len(valueColumns))

	for _, valueCol := range valueColumns {
		frame := data.NewFrame(valueCol)

		// Collect time and value data
		times := make([]*time.Time, 0, len(results))
		values := make([]*float64, 0, len(results))

		for _, row := range results {
			// Parse time
			timeVal, err := parseTimeValue(row[qm.TimeColumn])
			if err != nil {
				d.logger.Warn("Failed to parse time value", "error", err, "value", row[qm.TimeColumn])
				continue
			}
			times = append(times, timeVal)

			// Parse value
			val, err := parseNumericValue(row[valueCol])
			if err != nil {
				d.logger.Warn("Failed to parse numeric value", "error", err, "column", valueCol, "value", row[valueCol])
				values = append(values, nil)
			} else {
				values = append(values, val)
			}
		}

		// Add fields to frame
		frame.Fields = append(frame.Fields,
			data.NewField("time", nil, times),
			data.NewField(valueCol, nil, values),
		)

		frames = append(frames, frame)
	}

	return frames, nil
}

// convertToTableFrames converts results to table data frames
func (d *NocoDBDatasource) convertToTableFrames(results []map[string]interface{}, qm *QueryModel, refID string) ([]*data.Frame, error) {
	frame := data.NewFrame(refID)

	if len(results) == 0 {
		return []*data.Frame{frame}, nil
	}

	// Determine columns from first row or query specification
	columns := qm.Columns
	if len(columns) == 0 {
		// Use all columns from first result
		for key := range results[0] {
			columns = append(columns, key)
		}
	}

	// Create fields for each column
	fields := make(map[string]*data.Field)

	for _, col := range columns {
		// Infer field type from first non-nil value
		var fieldType data.FieldType
		var values []interface{}

		for _, row := range results {
			val, ok := row[col]
			if !ok {
				values = append(values, nil)
				continue
			}

			if fieldType == nil && val != nil {
				fieldType = inferFieldType(val)
			}

			values = append(values, val)
		}

		if fieldType == nil {
			fieldType = data.FieldTypeNullableString
		}

		// Create field with appropriate type
		field := createTypedField(col, fieldType, values)
		fields[col] = field
		frame.Fields = append(frame.Fields, field)
	}

	return []*data.Frame{frame}, nil
}

// inferFieldType infers the Grafana field type from a value
func inferFieldType(val interface{}) data.FieldType {
	switch val.(type) {
	case bool:
		return data.FieldTypeNullableBool
	case int, int8, int16, int32, int64:
		return data.FieldTypeNullableInt64
	case uint, uint8, uint16, uint32, uint64:
		return data.FieldTypeNullableUint64
	case float32, float64:
		return data.FieldTypeNullableFloat64
	case string:
		// Try to parse as time
		if _, err := time.Parse(time.RFC3339, val.(string)); err == nil {
			return data.FieldTypeNullableTime
		}
		return data.FieldTypeNullableString
	default:
		return data.FieldTypeNullableString
	}
}

// createTypedField creates a data field with the appropriate type
func createTypedField(name string, fieldType data.FieldType, values []interface{}) *data.Field {
	switch fieldType {
	case data.FieldTypeNullableBool:
		typedValues := make([]*bool, len(values))
		for i, v := range values {
			if v != nil {
				if b, ok := v.(bool); ok {
					typedValues[i] = &b
				}
			}
		}
		return data.NewField(name, nil, typedValues)

	case data.FieldTypeNullableInt64:
		typedValues := make([]*int64, len(values))
		for i, v := range values {
			if v != nil {
				if val, err := toInt64(v); err == nil {
					typedValues[i] = &val
				}
			}
		}
		return data.NewField(name, nil, typedValues)

	case data.FieldTypeNullableUint64:
		typedValues := make([]*uint64, len(values))
		for i, v := range values {
			if v != nil {
				if val, err := toUint64(v); err == nil {
					typedValues[i] = &val
				}
			}
		}
		return data.NewField(name, nil, typedValues)

	case data.FieldTypeNullableFloat64:
		typedValues := make([]*float64, len(values))
		for i, v := range values {
			if v != nil {
				if val, err := toFloat64(v); err == nil {
					typedValues[i] = &val
				}
			}
		}
		return data.NewField(name, nil, typedValues)

	case data.FieldTypeNullableTime:
		typedValues := make([]*time.Time, len(values))
		for i, v := range values {
			if v != nil {
				if t, err := parseTimeValue(v); err == nil {
					typedValues[i] = t
				}
			}
		}
		return data.NewField(name, nil, typedValues)

	default: // data.FieldTypeNullableString
		typedValues := make([]*string, len(values))
		for i, v := range values {
			if v != nil {
				s := fmt.Sprintf("%v", v)
				typedValues[i] = &s
			}
		}
		return data.NewField(name, nil, typedValues)
	}
}

// parseTimeValue parses a time value from various formats
func parseTimeValue(val interface{}) (*time.Time, error) {
	if val == nil {
		return nil, fmt.Errorf("nil time value")
	}

	switch v := val.(type) {
	case time.Time:
		return &v, nil
	case *time.Time:
		return v, nil
	case string:
		// Try multiple time formats
		formats := []string{
			time.RFC3339,
			time.RFC3339Nano,
			"2006-01-02T15:04:05",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}

		for _, format := range formats {
			if t, err := time.Parse(format, v); err == nil {
				return &t, nil
			}
		}
		return nil, fmt.Errorf("unable to parse time: %s", v)
	case int64:
		// Assume Unix timestamp
		t := time.Unix(v, 0)
		return &t, nil
	case float64:
		// Assume Unix timestamp
		t := time.Unix(int64(v), 0)
		return &t, nil
	default:
		return nil, fmt.Errorf("unsupported time type: %T", val)
	}
}

// parseNumericValue parses a numeric value
func parseNumericValue(val interface{}) (*float64, error) {
	if val == nil {
		return nil, nil
	}

	f, err := toFloat64(val)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// toInt64 converts various numeric types to int64
func toInt64(val interface{}) (int64, error) {
	switch v := val.(type) {
	case int:
		return int64(v), nil
	case int8:
		return int64(v), nil
	case int16:
		return int64(v), nil
	case int32:
		return int64(v), nil
	case int64:
		return v, nil
	case uint:
		return int64(v), nil
	case uint8:
		return int64(v), nil
	case uint16:
		return int64(v), nil
	case uint32:
		return int64(v), nil
	case uint64:
		return int64(v), nil
	case float32:
		return int64(v), nil
	case float64:
		return int64(v), nil
	default:
		return 0, fmt.Errorf("cannot convert %T to int64", val)
	}
}

// toUint64 converts various numeric types to uint64
func toUint64(val interface{}) (uint64, error) {
	switch v := val.(type) {
	case uint:
		return uint64(v), nil
	case uint8:
		return uint64(v), nil
	case uint16:
		return uint64(v), nil
	case uint32:
		return uint64(v), nil
	case uint64:
		return v, nil
	case int:
		return uint64(v), nil
	case int8:
		return uint64(v), nil
	case int16:
		return uint64(v), nil
	case int32:
		return uint64(v), nil
	case int64:
		return uint64(v), nil
	default:
		return 0, fmt.Errorf("cannot convert %T to uint64", val)
	}
}

// toFloat64 converts various numeric types to float64
func toFloat64(val interface{}) (float64, error) {
	switch v := val.(type) {
	case float32:
		return float64(v), nil
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case uint:
		return float64(v), nil
	case uint8:
		return float64(v), nil
	case uint16:
		return float64(v), nil
	case uint32:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", val)
	}
}
