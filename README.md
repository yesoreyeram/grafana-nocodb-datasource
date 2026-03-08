# Grafana NocoDB Datasource Plugin

A Grafana backend datasource plugin for [NocoDB](https://nocodb.com/) — the open-source Airtable alternative.

## Features

- **Backend plugin** with secure credential handling (API tokens stored encrypted)
- Query NocoDB tables with field selection, filtering, sorting, and pagination
- Health check endpoint for connection validation
- Template variable support in queries
- Production-grade with comprehensive unit and E2E tests

## Configuration

### Data Source Settings

| Setting   | Description                                         |
|-----------|-----------------------------------------------------|
| Base URL  | The base URL of your NocoDB instance (e.g., `https://nocodb.example.com`) |
| API Token | Your NocoDB API token (stored securely/encrypted)   |

### Query Options

| Option   | Description                                        | Example              |
|----------|----------------------------------------------------|----------------------|
| Table ID | The ID of the NocoDB table to query                | `tbl_abc123`         |
| Fields   | Comma-separated list of field names                | `Name,Age,Email`     |
| Where    | NocoDB filter expression                           | `(Name,eq,Alice)`    |
| Sort     | Sort expression (prefix with `-` for descending)   | `-CreatedAt`         |
| Limit    | Maximum number of records to return                | `100`                |
| Offset   | Number of records to skip (for pagination)         | `0`                  |

## Development

### Prerequisites

- Go 1.23+
- Node.js 20+
- npm 10+

### Building

```bash
# Install frontend dependencies
npm install

# Build frontend
npm run build

# Build backend
go build -o dist/gpx_nocodb_datasource_linux_amd64 -ldflags "-w -s" ./pkg
```

### Testing

```bash
# Run Go tests
go test -v ./pkg/...

# Run frontend tests (Jest)
npm test

# Run E2E tests (Playwright) - requires a running Grafana instance
npx playwright test
```

### Project Structure

```
├── pkg/                    # Go backend
│   ├── main.go             # Plugin entry point
│   ├── plugin/             # Datasource implementation
│   │   ├── datasource.go   # Query & health check handlers
│   │   └── datasource_test.go
│   ├── models/             # Data models
│   │   └── models.go
│   └── nocodb/             # NocoDB API client
│       ├── client.go
│       └── client_test.go
├── src/                    # TypeScript frontend
│   ├── module.ts           # Plugin module registration
│   ├── datasource.ts       # Frontend datasource class
│   ├── types.ts            # TypeScript type definitions
│   ├── components/         # React components
│   │   ├── ConfigEditor.tsx
│   │   └── QueryEditor.tsx
│   ├── __tests__/          # Jest unit tests
│   └── plugin.json         # Plugin metadata
├── tests/                  # Playwright E2E tests
│   └── datasource.spec.ts
├── go.mod                  # Go module definition
├── package.json            # npm package definition
└── webpack.config.js       # Webpack build configuration
```

## Security

- API tokens are stored in Grafana's encrypted secure JSON data store
- All NocoDB API calls are made from the backend (Go), never exposed to the browser
- Input validation on all query parameters
- HTTP client with 30-second timeout to prevent resource exhaustion
