import os

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

# google-genai reads GOOGLE_API_KEY; map GEMINI_API_KEY as a fallback
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# Validation rules
# ---------------------------------------------------------------------------

TRIAGE_REQUIRED_FIELDS = ["priority", "category", "assignee", "rationale"]

RESOLUTION_REQUIRED_SECTIONS = [
    "## Root Cause Analysis",
    "## Similar Past Issues",
    "## Suggested Fix",
    "## References",
]


# ---------------------------------------------------------------------------
# Tools — deterministic string checks; ADK can invoke these during validation
# ---------------------------------------------------------------------------

async def validate_triage(response: str) -> str:
    """Check that a triage response contains all required fields.

    Args:
        response: The triage response text to validate.

    Returns:
        "VALID" if all required fields are present, otherwise
        "INVALID: missing [field1, field2, ...]".
    """
    lower = response.lower()
    missing = [f for f in TRIAGE_REQUIRED_FIELDS if f not in lower]
    if not missing:
        return "VALID"
    return f"INVALID: missing {missing}"


async def validate_resolution(response: str) -> str:
    """Check that a resolution response contains all required sections and a URL.

    Args:
        response: The resolution response text to validate.

    Returns:
        "VALID" if all sections are present and ## References has at least one
        https:// URL, otherwise "INVALID: missing [section1, ...]".
    """
    missing = [s for s in RESOLUTION_REQUIRED_SECTIONS if s not in response]

    if "## References" not in missing and "https://" not in response:
        missing.append("https:// URL in ## References")

    if not missing:
        return "VALID"
    return f"INVALID: missing {missing}"


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

validator = Agent(
    name="validator",
    model="gemini-2.5-flash",
    instruction=(
        "You are a quality assurance agent for an issue tracking system. "
        "You review responses from other agents and determine if they are complete, "
        "accurate and well structured. If a response fails validation, you provide "
        "specific feedback on what needs to be corrected."
    ),
    tools=[validate_triage, validate_resolution],
)

# ---------------------------------------------------------------------------
# Runner — one shared instance per process
# ---------------------------------------------------------------------------

_session_service = InMemorySessionService()
_runner = Runner(
    agent=validator,
    app_name="issue_tracker",
    session_service=_session_service,
)


# ---------------------------------------------------------------------------
# Public coroutines called by other agents after they produce a response
# ---------------------------------------------------------------------------

async def validate_and_correct_triage(
    original_response: str,
    title: str,
    description: str | None,
) -> str:
    """Validate a triage response and request a correction if it is incomplete.

    Uses validate_triage to check for required fields. If the response is
    invalid, calls run_triage() again with correction instructions embedded
    in the description. Attempts at most 2 corrections before returning the
    original response with a warning.

    Args:
        original_response: The triage text produced by issue_manager.
        title:             The original issue title.
        description:       The original issue description.

    Returns:
        A validated triage response, or the original with a warning appended.
    """
    # Lazy import breaks the circular dependency with issue_manager.py
    from src.agents.issue_manager import run_triage

    result = await validate_triage(original_response)
    if result == "VALID":
        return original_response

    for attempt in range(2):
        correction_desc = (
            f"{description or ''}\n\n"
            f"CORRECTION REQUIRED (attempt {attempt + 1} of 2): {result}\n"
            f"You MUST explicitly include all of these fields in your response: "
            f"priority, category, assignee, rationale."
        )
        corrected = await run_triage(title=title, description=correction_desc)
        check = await validate_triage(corrected)
        if check == "VALID":
            return corrected
        result = check

    return original_response + f"\n\n⚠️ Validation warning: {result}"


async def validate_and_correct_resolution(
    original_response: str,
    issue_id: int | None,
    title: str,
    description: str | None,
) -> str:
    """Validate a resolution response and request a correction if it is incomplete.

    Uses validate_resolution to check for required sections and a References URL.
    If invalid, calls run_resolution() again with correction instructions. Attempts
    at most 2 corrections before returning the original response with a warning.

    Args:
        original_response: The resolution text produced by resolution_agent.
        issue_id:          The original issue ID (may be None).
        title:             The original issue title.
        description:       The original issue description.

    Returns:
        A validated resolution response, or the original with a warning appended.
    """
    # Lazy import breaks the circular dependency with resolution_agent.py
    from src.agents.resolution_agent import run_resolution

    result = await validate_resolution(original_response)
    if result == "VALID":
        return original_response

    for attempt in range(2):
        correction_desc = (
            f"{description or ''}\n\n"
            f"CORRECTION REQUIRED (attempt {attempt + 1} of 2): {result}\n"
            f"Your response MUST include all four sections with these exact headings: "
            f"## Root Cause Analysis, ## Similar Past Issues, ## Suggested Fix, ## References. "
            f"The ## References section MUST contain at least one https:// URL."
        )
        corrected = await run_resolution(
            issue_id=issue_id,
            title=title,
            description=correction_desc,
        )
        check = await validate_resolution(corrected)
        if check == "VALID":
            return corrected
        result = check

    return original_response + f"\n\n⚠️ Validation warning: {result}"
