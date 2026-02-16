# TicketInsight

> AI-powered issue tracking system with intelligent ticket analysis, comprehensive testing, Docker deployment, and automated CI/CD

**What it does:**
A full-featured AI-powered issue tracking system similar to JIRA or GitHub Issues, allowing teams to:
- Create and track issues/bugs with AI-assisted triage
- Query your entire issue backlog using natural language via an AI assistant
- Assign priorities and statuses
- Add comments and updates
- Filter and search issues
- Track issue lifecycle from creation to resolution
- Export data to CSV for reporting

---

## Key Highlights

- **AI Assistant** - GPT-4o-mini powered natural language interface for querying issues
- **126 Automated Tests** - Unit, integration, and E2E with Playwright across 3 browsers
- **Full Docker Stack** - Production-ready containerized deployment
- **CI/CD Pipeline** - Automated testing, building, release tagging, and GHCR image publishing
- **80%+ Test Coverage** - Comprehensive backend and frontend testing
- **Cross-Browser Tested** - Chrome, Firefox, Safari via Playwright
- **Automated Dependency Management** - Dependabot keeping all packages current
- **Real-Time Updates** - Dynamic filtering and live statistics
- **Professional Seed Data** - 22 realistic issues with 40+ comments

---

## Features

### User-Facing
✅ Complete issue lifecycle management (CRUD)
✅ **AI chat assistant** — ask questions like "show me all critical open issues" in plain English
✅ **Natural language ticket queries** powered by OpenAI GPT-4o-mini
✅ Advanced filtering by status, priority, assignee
✅ Real-time dashboard with live statistics
✅ Comment threads on issues
✅ Label organization system
✅ CSV export for reporting
✅ Delete with confirmation safeguards
✅ Responsive mobile-first design

### Technical
✅ RESTful API with full validation
✅ AI integration via OpenAI API with conversation history
✅ Database migrations for version control
✅ Comprehensive error handling
✅ Test-driven development approach
✅ Docker multi-stage builds
✅ GitHub Container Registry image publishing
✅ Automated dependency updates via Dependabot
✅ Tag-based release workflow with auto-generated changelogs

---

## Tech Stack

**Frontend:** Vue.js 3, Vite, Axios, CSS3
**Backend:** Node.js, Express, PostgreSQL
**AI:** OpenAI GPT-4o-mini
**DevOps:** Docker, GitHub Actions, GitHub Container Registry, Alpine Linux
**Testing:** Jest, Vitest, Playwright, Supertest
**Tools:** ESLint, Dependabot, Git, npm

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Vue.js 3 Frontend           │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  Dashboard   │  │  AI Assistant    │ │
│  │  (Issues)    │  │  (Chat UI)       │ │
│  └──────────────┘  └──────────────────┘ │
└────────────────────┬────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────┐
│           Node.js / Express              │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  Issues API  │  │  /api/ai/chat    │ │
│  │  Users API   │  │  (OpenAI proxy)  │ │
│  │  Stats API   │  └──────────────────┘ │
│  └──────┬───────┘           │           │
└─────────│───────────────────│───────────┘
          │                   │
┌─────────▼──────┐   ┌────────▼──────────┐
│   PostgreSQL   │   │   OpenAI API      │
│   Database     │   │   GPT-4o-mini     │
└────────────────┘   └───────────────────┘
```

---

## CI/CD Pipeline

### On every Pull Request
✅ Code linting (ESLint)
✅ Backend unit & integration tests with coverage
✅ Frontend unit tests with coverage
✅ E2E tests across Chrome, Firefox, and Safari
✅ Docker image builds (backend + frontend)
✅ Security scanning
✅ Database migration validation

### On git tag (`v*`)
✅ GitHub Release created with auto-generated changelog
✅ Docker images built and pushed to GitHub Container Registry
✅ Images tagged as both `latest` and the version tag

### Automated Dependency Management
✅ Dependabot monitors npm (backend + frontend), Docker, and GitHub Actions
✅ Weekly PRs for minor and patch updates — major versions ignored to prevent breaking changes
✅ Dev dependency updates grouped to reduce PR noise

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 126 |
| Backend Coverage | 80%+ |
| Frontend Coverage | 75%+ |
| E2E Test Scenarios | 48 |
| Browsers Tested | 3 (Chrome, Firefox, Safari) |
| Docker Image Size | <400MB |
| CI/CD Stages | 8 |
| AI Model | GPT-4o-mini |

---

## 🔧 API Endpoints

```
GET    /api/issues              List all issues (supports ?status, ?priority, ?search filters)
GET    /api/issues/:id          Get issue details with comments
POST   /api/issues              Create issue
PUT    /api/issues/:id          Update issue
DELETE /api/issues/:id          Delete issue
POST   /api/issues/:id/comments Add comment
GET    /api/users               List users
GET    /api/stats               Dashboard statistics
POST   /api/ai/chat             AI assistant chat (OpenAI proxy)
```

---

## Docker Images

Published to GitHub Container Registry on every release (Privately)

---

**Built with modern best practices and industry-standard tools**
