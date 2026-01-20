package plugin

import (
	"fmt"
	"regexp"
	"strings"
)

// validateSQL performs basic SQL validation to prevent dangerous operations
func validateSQL(sql string) error {
	// Convert to lowercase for checking
	sqlLower := strings.ToLower(strings.TrimSpace(sql))

	// Check for empty query
	if sqlLower == "" {
		return fmt.Errorf("SQL query cannot be empty")
	}

	// Block dangerous SQL operations
	dangerousPatterns := []string{
		"drop ",
		"truncate ",
		"delete ",
		"insert ",
		"update ",
		"alter ",
		"create ",
		"grant ",
		"revoke ",
		"exec ",
		"execute ",
		"xp_",
		"sp_",
		"-- ",
		"/*",
		";--",
		"';",
		`";"`,
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(sqlLower, pattern) {
			return fmt.Errorf("SQL query contains potentially dangerous operation: %s", pattern)
		}
	}

	// Only allow SELECT queries
	if !strings.HasPrefix(sqlLower, "select ") && !strings.HasPrefix(sqlLower, "with ") {
		return fmt.Errorf("only SELECT queries are allowed")
	}

	// Check for SQL injection patterns
	injectionPatterns := []string{
		`'\s*or\s*'`,
		`'\s*and\s*'`,
		`'\s*=\s*'`,
		`union\s+select`,
		`'\s*;\s*`,
	}

	for _, pattern := range injectionPatterns {
		matched, err := regexp.MatchString(pattern, sqlLower)
		if err == nil && matched {
			return fmt.Errorf("SQL query contains potential injection pattern")
		}
	}

	// Limit query length (prevent DoS)
	if len(sql) > 10000 {
		return fmt.Errorf("SQL query is too long (max 10000 characters)")
	}

	return nil
}

// sanitizeString sanitizes a string for safe use in SQL or logging
func sanitizeString(s string) string {
	// Remove potentially dangerous characters
	s = strings.ReplaceAll(s, "\x00", "")
	s = strings.ReplaceAll(s, "\r", "")
	// Limit length
	if len(s) > 1000 {
		s = s[:1000] + "..."
	}
	return s
}

// isValidTableName validates a table name
func isValidTableName(name string) bool {
	if name == "" {
		return false
	}

	// Table name should only contain alphanumeric, underscore, and dash
	matched, err := regexp.MatchString(`^[a-zA-Z0-9_-]+$`, name)
	if err != nil || !matched {
		return false
	}

	// Length check
	if len(name) > 64 {
		return false
	}

	return true
}

// isValidColumnName validates a column name
func isValidColumnName(name string) bool {
	if name == "" {
		return false
	}

	// Column name should only contain alphanumeric, underscore, and dash
	matched, err := regexp.MatchString(`^[a-zA-Z0-9_-]+$`, name)
	if err != nil || !matched {
		return false
	}

	// Length check
	if len(name) > 64 {
		return false
	}

	return true
}

// isValidProjectID validates a project ID
func isValidProjectID(id string) bool {
	if id == "" {
		return false
	}

	// Project ID should be alphanumeric with possible dashes
	matched, err := regexp.MatchString(`^[a-zA-Z0-9-]+$`, id)
	if err != nil || !matched {
		return false
	}

	return true
}

// truncateString truncates a string to a maximum length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// contains checks if a string slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// unique returns unique strings from a slice
func unique(slice []string) []string {
	seen := make(map[string]bool)
	result := []string{}

	for _, item := range slice {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}
