# ADR-005: Dedicated Validator Agent with Self-Correction Loop

## Context

LLMs are non-deterministic. Even with a well-crafted prompt, a Gemini response may occasionally omit a required triage field (priority, category, assignee, rationale) or a required resolution section heading, and these incomplete responses propagate to the frontend silently. I needed a reliable way to enforce output structure beyond prompt engineering alone.

## Decision

A `validator.py` module was created containing:

- **Two deterministic tool functions** (`validate_triage`, `validate_resolution`) that check for required fields/sections and a valid `https://` URL in References. These return `"VALID"` or `"INVALID: missing [...]"` — no LLM call involved.
- **Two public coroutines** (`validate_and_correct_triage`, `validate_and_correct_resolution`) that call the tool functions and, on failure, embed the specific validation feedback into the description and re-invoke the originating agent (up to 2 correction attempts).

The self-correction prompts are surgical — they list exactly which fields or sections are missing, minimising unnecessary token usage. Circular imports between `issue_manager.py ↔ validator.py` and `resolution_agent.py ↔ validator.py` are resolved with lazy function-body imports.

## Consequences

| **Positive** | **Negative** |
|---|---|
| Response completeness is enforced programmatically, not just by prompt engineering. | Worst-case latency is ~3× the base agent call (original + 2 correction attempts), though this path is infrequent. |
| Validation rules (`TRIAGE_REQUIRED_FIELDS`, `RESOLUTION_REQUIRED_SECTIONS`) are co-located constants — easy to extend. | Two additional LLM calls per failed validation add token cost; the bounded retry count (2) caps the exposure. |
| Correction prompts are surgical — they list exactly what is missing, converging faster than blind retries. | The validator catches only structural omissions, not semantic errors. A confidently wrong root cause analysis will pass. |
