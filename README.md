# Recall Kit - Experience Sharing Platform

A platform for sharing and reusing AI interaction experiences through MCP protocol.

## Features

- **MCP Protocol Support**: Agent integration for querying and submitting experiences
- **Web Interface**: Search and browse experiences anonymously
- **Admin Dashboard**: Content moderation and management
- **Real-time Search**: Full-text search with relevance ranking
- **Secure**: Row-level security and code sanitization

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: Supabase PostgreSQL
- **MCP**: Node.js, Express, MCP SDK
- **Authentication**: Supabase Auth

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd recall-kit
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Set up Supabase:
- Create a new Supabase project
- Run database migrations:
```bash
supabase db reset
```

5. Start development servers:
```bash
# Start web app
pnpm run dev:web

# Start MCP server (in separate terminal)
pnpm run dev:mcp-server
```

## Project Structure

```
recall-kit/
├── web/                 # Next.js web application
├── mcp-server/          # MCP protocol server
├── mcp-client/          # MCP client (to be implemented)
├── supabase/           # Database migrations
├── docs/               # Documentation
└── prototypes/         # Design prototypes
```

## MCP Integration

### Query Experiences
Agents can query experiences using MCP protocol:

```json
{
  "method": "query_experiences",
  "params": {
    "keywords": ["react", "typescript"],
    "limit": 10,
    "sort": "relevance"
  }
}
```

### Submit Experience
Agents can submit new experiences:

```json
{
  "method": "submit_experience",
  "params": {
    "title": "Issue description",
    "problem_description": "Detailed problem",
    "solution": "Solution steps",
    "context": "Code context (sanitized)",
    "keywords": ["react", "error"]
  }
}
```

## API Endpoints

### Web API
- `GET /api/experiences` - Search experiences
- `GET /api/experiences/[id]` - Get experience by ID

### Admin API (requires authentication)
- `GET /api/admin/experiences` - List experiences for moderation
- `PUT /api/admin/experiences/[id]` - Update experience
- `DELETE /api/admin/experiences/[id]` - Soft delete experience

### MCP API
- `POST /mcp` - MCP protocol endpoint

## Development

### Running Tests
```bash
pnpm test
```

### Building for Production
```bash
pnpm build
```

### Database Migrations
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db reset
```

## Deployment

### Vercel (Web App)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy automatically

### Railway/Render (MCP Server)
1. Deploy `mcp-server` directory
2. Set environment variables
3. Configure reverse proxy if needed

### Supabase
1. Create production project
2. Run migrations:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and add tests
4. Submit pull request

## License

MIT License - see LICENSE file for details.