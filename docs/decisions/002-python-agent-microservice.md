# ADR-002: Separate Python FastAPI Microservice for AI Agents

## Context

Track Insight's AI capabilities started as a thin proxy to OpenAI's Chat Completions API within the Node.js backend. As scope expanded to include autonomous agents with tool use, multi-step reasoning, and structured output validation, a more capable framework was needed. Google ADK — the primary candidate — is Python-native with no official Node.js SDK, so I had to decide whether to run agent logic inside the existing Node.js process or as a separate service.

## Decision

A standalone Python FastAPI microservice (`agents/`) hosts all agent logic.

- **Language:** Python 3.11 — the natural home of the AI/ML ecosystem (ADK, asyncpg, transformers).
- **Framework:** FastAPI — async-native, minimal boilerplate, automatic OpenAPI docs, Pydantic validation.
- **Deployment:** Its own Docker container on port 8000, added to `docker-compose.yml`.
- **Integration:** The Node.js backend calls it over HTTP using native `fetch`, treating it as an optional capability — if unavailable, a graceful 503 is returned rather than crashing.

## Alternatives Considered

| Option | Why rejected |
|---|---|
| **Node.js child process running Python** | Fragile IPC, no parallelism, difficult to scale independently. |
| **Unofficial ADK bindings for Node.js** | No production-quality bindings exist; maintaining a fork would be an ongoing burden. |
| **Serverless function (Lambda) for agents** | Agent runs can exceed Lambda's 15-minute timeout; cold start latency is inappropriate for interactive requests. |

## Consequences

| **Positive** | **Negative** |
|---|---|
| Full access to the Python AI ecosystem with zero compatibility shims. | Additional network hop introduced for all agent-routed requests. |
| Agent service scales independently of the API backend — different scaling profiles (slow agent calls vs. fast CRUD). | Two dependency trees (npm and pip) to maintain. |
| Clear service boundary: Node.js owns data and API contracts; Python owns agent logic. | Agent service must be explicitly handled as an optional dependency to avoid cascading failures. |
