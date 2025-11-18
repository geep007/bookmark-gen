# Web Application

Next.js 15 web application for the Unified Bookmark Intelligence System.

## Structure

```
app/
├── api/               # API routes
│   ├── health/        # Health check endpoint
│   ├── sync/          # Bookmark sync endpoints
│   │   ├── twitter/   # Twitter MCP sync (Epic 1, Story 1.3)
│   │   ├── linkedin/  # LinkedIn MCP sync (Epic 1, Story 1.4)
│   │   └── status/    # Sync status (Epic 1, Story 1.6)
│   ├── enrich/        # Enrichment endpoints (Epic 2)
│   └── query/         # Query endpoints (Epic 3)
├── dashboard/         # Dashboard page (Epic 4)
├── globals.css        # Global styles
├── layout.tsx         # Root layout
└── page.tsx           # Home page
```

## API Endpoints

### Implemented
- `GET /api/health` - Health check
- `GET /api/sync/status` - Get sync status

### Pending Implementation
- `POST /api/sync/twitter` - Epic 1, Story 1.3
- `POST /api/sync/linkedin` - Epic 1, Story 1.4
- `POST /api/enrich/batch` - Epic 2, Story 2.6
- `GET /api/enrich/status` - Epic 2, Story 2.6
- `GET /api/enrichment/metrics` - Epic 2, Story 2.7
- `POST /api/query` - Epic 3, Story 3.5

## Development

```bash
# From workspace root
npm run dev

# Or from this package
npm run dev
```

The application will be available at `http://localhost:3000`

## Epic Implementation Status

- ✅ Epic 1, Story 1.1: Project initialization
- ⏳ Epic 1, Story 1.3-1.6: MCP integration and API endpoints
- ⏳ Epic 2: Enrichment services
- ⏳ Epic 3: Query services
- ⏳ Epic 4: UI components
