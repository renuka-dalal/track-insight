# ADR-004: Graceful Degradation for Agent Service Calls from the JS Backend

## Context

The Node.js backend routes certain chat messages to the Python agent service based on keyword detection. Agent calls routinely take 10–60 seconds due to multi-step LLM reasoning and external web search, creating two risks: availability coupling (an agent service outage breaks the chat UI) and timeout cascades (slow calls tying up the event loop if unbounded).

## Decision

Agent calls from `routes/ai-chat.js` and `routes/agents.js` follow this contract:

- **Requests are awaited** — the JS backend waits for the agent's response because the frontend needs the result to render.
- **Failures are isolated** — if the agent service is unreachable or returns a non-2xx response, the backend returns a `503 Service Unavailable` with a human-readable message rather than crashing.
- **Timeouts are bounded** — all `fetch` calls use `AbortSignal.timeout` (60–120 seconds).
- **The OpenAI path is unaffected** — messages that do not match agent keywords continue to the existing OpenAI integration regardless of agent service health.
- **No automatic fallback** — agent-routed messages do not silently fall back to OpenAI on failure. A triage or resolution response from OpenAI (without DB tool access) would be lower quality and potentially misleading.

## Consequences

| **Positive** | **Negative** |
|---|---|
| Core issue tracking UI (CRUD, filtering, statistics) is completely unaffected by agent service outages. | Users receive a clear error rather than a degraded response during agent outages — a deliberate trade-off favouring accuracy over availability. |
| The OpenAI chat path continues to operate normally when agents are down. | Agent response latency (up to 60s) is visible as a slow chat response; there is no streaming or progressive rendering yet. |
| `AbortSignal.timeout` is built into Node.js 18+; no additional dependency required. | |
