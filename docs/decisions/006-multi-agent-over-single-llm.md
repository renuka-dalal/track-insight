# ADR-006: Multi-Agent Architecture over a Single LLM Call

## Context

Adding AI-powered issue analysis required choosing between a single large prompt covering all task types or a multi-agent architecture with specialised agents. The project needs to handle three distinct task types (triage, web search, resolution), each requiring different tools and evaluation criteria — making a monolithic prompt impractical for consistent quality across all three.

## Decision

A multi-agent architecture using Google ADK was adopted, consisting of five agents:

| Agent | Responsibility | Tools |
|---|---|---|
| **Coordinator** | Routes user requests to the right specialist | triage_issue, resolve_issue, search_solutions |
| **Issue Manager** | Triages issues; queries and summarises issues from DB | get_issue, list_issues, create_issue_summary |
| **Search Agent** | Web search for solutions and documentation | google_search (built-in ADK tool) |
| **Resolution Agent** | Produces structured resolution plans | get_issue_details, get_similar_issues, search_for_solutions |
| **Validator** | Checks structural completeness; drives self-correction | validate_triage, validate_resolution |

Each agent has its own `InMemorySessionService` and `Runner` instance, created once per process as a module-level singleton.

## Consequences

| **Positive** | **Negative** |
|---|---|
| Each agent has a small, focused context window — the model receives only information relevant to its task, reducing hallucination. | A simple triage request requires two LLM calls (Coordinator + Issue Manager), adding routing overhead. |
| Agents are independently testable and replaceable without touching the rest of the pipeline. | Debugging a failed multi-step run requires correlating logs across multiple agents. |
| The Coordinator provides a single `/api/agents/chat` entry point, hiding the internal topology from the JS backend. | Multiple agent instantiations at startup increase memory footprint slightly. |
