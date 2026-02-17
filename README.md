# Track Insight

> AI-powered issue tracking system with intelligent ticket analysis, comprehensive testing, Docker deployment, and automated CI/CD

[![CI](https://github.com/renuka-dalal/ticket-insight/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/renuka-dalal/ticket-insight/actions)
[![Release](https://github.com/renuka-dalal/ticket-insight/actions/workflows/release.yml/badge.svg)](https://github.com/renuka-dalal/ticket-insight/releases)

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
1. Complete issue lifecycle management (CRUD)
2. **AI chat assistant** — ask questions like "show me all critical open issues" in plain English
3. **Natural language ticket queries** powered by OpenAI GPT-4o-mini
4. Advanced filtering by status, priority, assignee
5. Real-time dashboard with live statistics
6. Comment threads on issues
7. Label organization system
8. CSV export for reporting
9. Delete with confirmation safeguards
10. Responsive mobile-first design

### Technical
1. RESTful API with full validation
2. AI integration via OpenAI API with conversation history
3. Database migrations for version control
4. Comprehensive error handling
5. Test-driven development approach
6. Docker multi-stage builds
7. GitHub Container Registry image publishing
8. Automated dependency updates via Dependabot
9. Tag-based release workflow with auto-generated changelogs

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

## 🚀 Hugging Face Deployment

This Space requires an OpenAI API key to power the AI assistant.

**Note:** The database resets on Space restarts. This is intentional for demo purposes with fresh seed data.

---

## CI/CD Pipeline

### On every Pull Request
- Code linting (ESLint)
- Backend unit & integration tests with coverage
- Frontend unit tests with coverage
- E2E tests across Chrome, Firefox, and Safari
- Docker image builds (backend + frontend)
- Security scanning
- Database migration validation

### On git tag (`v*`)
- GitHub Release created with auto-generated changelog
- Docker images built and pushed to GitHub Container Registry
- Images tagged as both `latest` and the version tag

### Automated Dependency Management
- Dependabot monitors npm (backend + frontend), Docker, and GitHub Actions
- Weekly PRs for minor and patch updates — major versions ignored to prevent breaking changes
- Dev dependency updates grouped to reduce PR noise

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

Published to GitHub Container Registry on every release.

---

**Built with modern best practices and industry-standard tools**
