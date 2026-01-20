package plugin

import (
	"testing"
)

func TestValidateSQL(t *testing.T) {
	tests := []struct {
		name    string
		sql     string
		wantErr bool
	}{
		{
			name:    "valid SELECT query",
			sql:     "SELECT * FROM users WHERE id = 1",
			wantErr: false,
		},
		{
			name:    "valid SELECT with JOIN",
			sql:     "SELECT u.*, p.name FROM users u JOIN projects p ON u.id = p.user_id",
			wantErr: false,
		},
		{
			name:    "valid WITH clause",
			sql:     "WITH temp AS (SELECT * FROM users) SELECT * FROM temp",
			wantErr: false,
		},
		{
			name:    "empty query",
			sql:     "",
			wantErr: true,
		},
		{
			name:    "DROP table attempt",
			sql:     "DROP TABLE users",
			wantErr: true,
		},
		{
			name:    "DELETE attempt",
			sql:     "DELETE FROM users WHERE id = 1",
			wantErr: true,
		},
		{
			name:    "INSERT attempt",
			sql:     "INSERT INTO users (name) VALUES ('test')",
			wantErr: true,
		},
		{
			name:    "UPDATE attempt",
			sql:     "UPDATE users SET name = 'test' WHERE id = 1",
			wantErr: true,
		},
		{
			name:    "SQL injection attempt - OR 1=1",
			sql:     "SELECT * FROM users WHERE name = '' OR '1'='1'",
			wantErr: true,
		},
		{
			name:    "SQL injection attempt - UNION",
			sql:     "SELECT * FROM users UNION SELECT * FROM passwords",
			wantErr: true,
		},
		{
			name:    "too long query",
			sql:     string(make([]byte, 20000)),
			wantErr: true,
		},
		{
			name:    "non-SELECT query",
			sql:     "SHOW TABLES",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSQL(tt.sql)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateSQL() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestIsValidTableName(t *testing.T) {
	tests := []struct {
		name      string
		tableName string
		want      bool
	}{
		{
			name:      "valid table name",
			tableName: "users",
			want:      true,
		},
		{
			name:      "valid table name with underscore",
			tableName: "user_profiles",
			want:      true,
		},
		{
			name:      "valid table name with dash",
			tableName: "user-profiles",
			want:      true,
		},
		{
			name:      "valid table name with numbers",
			tableName: "users123",
			want:      true,
		},
		{
			name:      "empty table name",
			tableName: "",
			want:      false,
		},
		{
			name:      "table name with spaces",
			tableName: "user profiles",
			want:      false,
		},
		{
			name:      "table name with special characters",
			tableName: "users@#$",
			want:      false,
		},
		{
			name:      "table name too long",
			tableName: string(make([]byte, 100)),
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidTableName(tt.tableName); got != tt.want {
				t.Errorf("isValidTableName() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidColumnName(t *testing.T) {
	tests := []struct {
		name       string
		columnName string
		want       bool
	}{
		{
			name:       "valid column name",
			columnName: "username",
			want:       true,
		},
		{
			name:       "valid column name with underscore",
			columnName: "user_name",
			want:       true,
		},
		{
			name:       "valid column name with dash",
			columnName: "user-name",
			want:       true,
		},
		{
			name:       "empty column name",
			columnName: "",
			want:       false,
		},
		{
			name:       "column name with spaces",
			columnName: "user name",
			want:       false,
		},
		{
			name:       "column name with special characters",
			columnName: "user@name",
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidColumnName(tt.columnName); got != tt.want {
				t.Errorf("isValidColumnName() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidProjectID(t *testing.T) {
	tests := []struct {
		name      string
		projectID string
		want      bool
	}{
		{
			name:      "valid project ID",
			projectID: "p1a2b3c4d5",
			want:      true,
		},
		{
			name:      "valid project ID with dashes",
			projectID: "project-123-abc",
			want:      true,
		},
		{
			name:      "empty project ID",
			projectID: "",
			want:      false,
		},
		{
			name:      "project ID with special characters",
			projectID: "project@123",
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isValidProjectID(tt.projectID); got != tt.want {
				t.Errorf("isValidProjectID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestTruncateString(t *testing.T) {
	tests := []struct {
		name   string
		str    string
		maxLen int
		want   string
	}{
		{
			name:   "string shorter than max",
			str:    "hello",
			maxLen: 10,
			want:   "hello",
		},
		{
			name:   "string equal to max",
			str:    "hello",
			maxLen: 5,
			want:   "hello",
		},
		{
			name:   "string longer than max",
			str:    "hello world",
			maxLen: 5,
			want:   "hello...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := truncateString(tt.str, tt.maxLen); got != tt.want {
				t.Errorf("truncateString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestContains(t *testing.T) {
	tests := []struct {
		name  string
		slice []string
		item  string
		want  bool
	}{
		{
			name:  "item exists",
			slice: []string{"apple", "banana", "orange"},
			item:  "banana",
			want:  true,
		},
		{
			name:  "item does not exist",
			slice: []string{"apple", "banana", "orange"},
			item:  "grape",
			want:  false,
		},
		{
			name:  "empty slice",
			slice: []string{},
			item:  "apple",
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := contains(tt.slice, tt.item); got != tt.want {
				t.Errorf("contains() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestUnique(t *testing.T) {
	tests := []struct {
		name  string
		slice []string
		want  []string
	}{
		{
			name:  "no duplicates",
			slice: []string{"apple", "banana", "orange"},
			want:  []string{"apple", "banana", "orange"},
		},
		{
			name:  "with duplicates",
			slice: []string{"apple", "banana", "apple", "orange", "banana"},
			want:  []string{"apple", "banana", "orange"},
		},
		{
			name:  "empty slice",
			slice: []string{},
			want:  []string{},
		},
		{
			name:  "all duplicates",
			slice: []string{"apple", "apple", "apple"},
			want:  []string{"apple"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := unique(tt.slice)
			if len(got) != len(tt.want) {
				t.Errorf("unique() length = %v, want %v", len(got), len(tt.want))
				return
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("unique() = %v, want %v", got, tt.want)
					return
				}
			}
		})
	}
}
