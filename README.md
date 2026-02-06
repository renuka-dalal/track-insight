# Issue Tracker

> Enterprise-grade issue tracking system with comprehensive testing, Docker deployment, and automated CI/CD

**What it does:**
A full-featured issue/bug tracking system similar to JIRA or GitHub Issues, allowing teams to:
- Create and track issues/bugs
- Assign priorities and statuses
- Add comments and updates
- Filter and search issues
- Track issue lifecycle from creation to resolution
---

## Key Highlights

- **65+ Automated Tests** - Unit, integration, and E2E with Playwright
- **Full Docker Stack** - Production-ready containerized deployment
- **CI/CD Pipeline** - Automated testing, building, and validation
- **80%+ Test Coverage** - Comprehensive backend and frontend testing
- **Cross-Browser Tested** - Chrome, Firefox, Safari support
- **Real-Time Updates** - Dynamic filtering and live statistics
- **Professional Seed Data** - 22 realistic issues with 40+ comments

---

## Features

### User-Facing
✅ Complete issue lifecycle management (CRUD)  
✅ Advanced filtering by status, priority, assignee  
✅ Real-time dashboard with live statistics  
✅ Comment threads on issues  
✅ Label organization system  
✅ CSV export for reporting  
✅ Delete with confirmation safeguards  

### Technical
✅ RESTful API with full validation  
✅ Responsive mobile-first design  
✅ Database migrations for version control  
✅ Comprehensive error handling  
✅ Test-driven development approach  
✅ Docker multi-stage builds  

---

## Tech Stack

**Frontend:** Vue.js 3, Vite, Axios, CSS3  
**Backend:** Node.js, Express, PostgreSQL  
**DevOps:** Docker, GitHub Actions, Alpine Linux  
**Testing:** Jest, Vitest, Playwright, Supertest  
**Tools:** ESLint, Git, npm

---

## CI/CD Pipeline

Automated checks on every pull request:

✅ Code linting (ESLint)  
✅ Unit tests with coverage  
✅ Integration tests  
✅ E2E tests (3 browsers)  
✅ Docker image builds  
✅ Security scanning  
✅ Database migration validation  

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 65+ |
| Backend Coverage | 80%+ |
| Frontend Coverage | 75%+ |
| E2E Test Scenarios | 48 |
| Docker Image Size | <400MB |
| CI/CD Stages | 8 |

---

## 🔧 API Endpoints

```
GET    /api/issues              List all issues
GET    /api/issues/:id          Get issue details
POST   /api/issues              Create issue
PUT    /api/issues/:id          Update issue
DELETE /api/issues/:id          Delete issue
POST   /api/issues/:id/comments Add comment
GET    /api/users               List users
GET    /api/stats               Dashboard stats
```

---

**Built with modern best practices and industry-standard tools**
