# Grafana NocoDB Datasource Plugin

[![CI](https://github.com/yourusername/grafana-nocodb-datasource/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/grafana-nocodb-datasource/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yourusername/grafana-nocodb-datasource)](LICENSE)

Enterprise-ready Grafana datasource plugin for querying NocoDB databases with comprehensive features including table queries, filters, sorting, caching, and security best practices.

## Features

- **🔌 Full NocoDB Integration** - Connect to NocoDB cloud or self-hosted instances
- **📊 Table Queries** - Query any table with filters, sorting, and column selection
- **💾 SQL Support** - Execute raw SQL queries (SELECT only for security)
- **⚡ Performance** - Built-in query caching with configurable TTL
- **🔒 Security** - SQL injection protection, input validation, encrypted credentials
- **📈 Time Series** - Support for time-series data visualization
- **🧪 Comprehensive Testing** - Unit tests, E2E tests with Playwright
- **🐳 Docker Support** - Development environment with Docker Compose
- **🚀 CI/CD** - GitHub Actions for automated testing and deployment

## Installation

### From Grafana Plugin Catalog

```bash
grafana-cli plugins install grafana-nocodb-datasource
```

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/grafana-nocodb-datasource/releases)
2. Extract to your Grafana plugins directory:
   ```bash
   unzip grafana-nocodb-datasource.zip -d /var/lib/grafana/plugins/
   ```
3. Restart Grafana

### Docker Installation

```bash
docker run -d \
  -p 3000:3000 \
  -e "GF_INSTALL_PLUGINS=grafana-nocodb-datasource" \
  grafana/grafana
```

## Configuration

### Prerequisites

- NocoDB instance (cloud or self-hosted)
- NocoDB API token (generate from your NocoDB account settings)

### Datasource Setup

1. Navigate to **Configuration** > **Data Sources** in Grafana
2. Click **Add data source**
3. Search for and select **NocoDB**
4. Configure the connection:
   - **NocoDB URL**: Your NocoDB instance URL (e.g., `https://app.nocodb.com`)
   - **API Token**: Your NocoDB API token (stored securely)
   - **Default Project ID** (optional): Set a default project
   - **Default Base ID** (optional): Set a default base

### Connection Options

| Option | Description | Default |
|--------|-------------|---------|
| Request Timeout | Maximum time in seconds for requests | 30 |
| Skip TLS Verification | Skip TLS certificate verification (not recommended for production) | false |
| Default Limit | Default number of rows to return | 1000 |
| Maximum Limit | Maximum rows allowed in a single query | 10000 |
| Enable Caching | Cache query results for improved performance | true |
| Default Cache Duration | Cache TTL in seconds | 300 |

## Usage

### Table Query

1. Create a new panel in your dashboard
2. Select the NocoDB datasource
3. Choose **Query Type**: **Table**
4. Select a **Table** from the dropdown
5. Configure your query:
   - **Columns**: Select specific columns (empty = all columns)
   - **Filters**: Add WHERE conditions
   - **Sorting**: Order results by columns
   - **Limit/Offset**: Pagination controls
   - **Time Column**: Specify for time-series data

#### Example: Query User Activity

```
Query Type: Table
Table: user_activity
Columns: timestamp, user_id, action, duration
Filters:
  - action = "login"
  - timestamp >= $__timeFrom()
Sorting:
  - timestamp DESC
Limit: 1000
Time Column: timestamp
```

### Raw SQL Query

For advanced use cases, you can write raw SQL queries:

1. Choose **Query Type**: **Raw SQL**
2. Enter your SQL query (SELECT statements only)
3. Provide Project ID and Base ID

```sql
SELECT
  DATE_TRUNC('hour', timestamp) as time,
  COUNT(*) as count
FROM user_activity
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY time
ORDER BY time
```

**Security Note**: Only SELECT queries are allowed. Dangerous operations (DROP, DELETE, UPDATE, etc.) are blocked.

### Template Variables

Use Grafana template variables in your queries:

```
Filters:
  - region = "$region"
  - status = "$status"
```

## Development

### Prerequisites

- Node.js 20+
- Go 1.21+
- Docker and Docker Compose
- Mage (Go build tool)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grafana-nocodb-datasource.git
   cd grafana-nocodb-datasource
   ```

2. Install dependencies:
   ```bash
   npm install
   go mod download
   ```

3. Start development environment:
   ```bash
   docker compose up -d
   ```

4. Build the plugin:
   ```bash
   npm run dev  # Frontend development mode
   mage -v     # Backend build
   ```

### Development Workflow

```bash
# Frontend development (watch mode)
npm run dev

# Backend development
mage -v build:linux

# Run tests
npm run test          # Frontend tests (watch mode)
npm run test:ci       # Frontend tests (CI mode)
go test ./pkg/...     # Backend tests
mage coverage         # Backend tests with coverage

# Linting and type checking
npm run lint
npm run typecheck

# E2E tests
npm run e2e
npm run e2e:ui       # Interactive mode
```

### Project Structure

```
grafana-nocodb-datasource/
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
├── pkg/
│   ├── main.go        # Plugin entry point
│   └── plugin/
│       ├── plugin.go   # Main datasource implementation
│       ├── client.go   # NocoDB API client
│       ├── models.go   # Data structures
│       ├── query.go    # Query processing
│       ├── utils.go    # Utilities and validation
│       └── *_test.go   # Unit tests
├── src/
│   ├── ConfigEditor.tsx    # Datasource configuration UI
│   ├── QueryEditor.tsx     # Query editor UI
│   ├── datasource.ts       # Frontend datasource class
│   ├── types.ts            # TypeScript type definitions
│   └── module.ts           # Plugin module
├── docker-compose.yml  # Development environment
├── webpack.config.ts   # Build configuration
├── jest.config.js      # Test configuration
└── package.json        # Dependencies and scripts
```

## Testing

### Unit Tests

#### Frontend
```bash
npm run test          # Watch mode
npm run test:ci       # CI mode with coverage
```

#### Backend
```bash
go test ./pkg/...
mage coverage         # With coverage report
```

### E2E Tests

```bash
# Start services
docker compose up -d

# Run E2E tests
npm run e2e

# Interactive mode
npm run e2e:ui
```

### Coverage

Test coverage reports are automatically generated and uploaded to Codecov on CI runs.

## Security

### Best Practices

- ✅ API tokens stored encrypted in Grafana's secure storage
- ✅ SQL injection prevention with validation
- ✅ Input sanitization for all user inputs
- ✅ Read-only SQL queries (SELECT only)
- ✅ TLS/SSL support
- ✅ Regular security scans with Trivy and gosec
- ✅ Dependency vulnerability scanning

### Reporting Security Issues

Please report security vulnerabilities to [security@yourorg.com](mailto:security@yourorg.com).

## Architecture

### Backend (Go)

- **Plugin SDK**: Built on Grafana Plugin SDK for Go
- **HTTP Client**: Robust HTTP client with retries and timeouts
- **Caching**: In-memory LRU cache with TTL
- **Data Processing**: Efficient conversion to Grafana data frames
- **Validation**: Comprehensive input validation and SQL injection prevention

### Frontend (TypeScript/React)

- **Modern React**: Functional components with hooks
- **Type Safety**: Full TypeScript coverage
- **Grafana UI**: Uses official Grafana UI components
- **State Management**: React hooks for local state
- **API Communication**: Backend-driven with resource handlers

## Performance

- **Query Caching**: Configurable caching reduces API calls
- **Connection Pooling**: Efficient HTTP connection reuse
- **Data Streaming**: Supports large result sets
- **Pagination**: Built-in limit/offset support

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Wiki](https://github.com/yourusername/grafana-nocodb-datasource/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/grafana-nocodb-datasource/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/grafana-nocodb-datasource/discussions)

## Acknowledgments

- [Grafana](https://grafana.com/) - The open observability platform
- [NocoDB](https://nocodb.com/) - Open source Airtable alternative
- [Grafana Plugin SDK](https://github.com/grafana/grafana-plugin-sdk-go) - Official plugin development framework

## Roadmap

- [ ] Support for NocoDB Views
- [ ] Advanced aggregation functions
- [ ] Query builder UI improvements
- [ ] Support for NocoDB Forms and Grid views
- [ ] Webhooks integration
- [ ] Multi-tenancy support

---

Made with ❤️ by [Your Organization]
