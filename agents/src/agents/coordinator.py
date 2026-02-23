import os

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from src.agents.issue_manager import run_triage
from src.agents.resolution_agent import run_resolution
from src.agents.search_agent import run_search

# google-genai reads GOOGLE_API_KEY; map GEMINI_API_KEY as a fallback
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# Tools — each wraps a specialist agent's public coroutine
# ---------------------------------------------------------------------------

async def triage_issue(title: str, description: str = None) -> str:
    """Delegate to the issue manager agent to triage a new issue.

    Use this when the user wants to assess an issue's priority, assign a
    category, or get a suggested assignee for a newly submitted issue.

    Args:
        title:       The issue title.
        description: Optional issue description for additional context.

    Returns:
        A triage suggestion including priority, category, suggested assignee,
        and rationale.
    """
    return await run_triage(title=title, description=description)


async def resolve_issue(
    title: str,
    description: str = None,
    issue_id: int = None,
) -> str:
    """Delegate to the resolution agent for a full structured resolution plan.

    Use this when the user wants a root cause analysis, a step-by-step fix,
    references to similar past issues, or a comprehensive resolution strategy.

    Args:
        title:       The issue title.
        description: Optional issue description.
        issue_id:    Optional numeric ID of an existing issue in the database.

    Returns:
        A markdown resolution plan with Root Cause Analysis, Similar Past Issues,
        Suggested Fix, and References sections.
    """
    return await run_resolution(
        issue_id=issue_id,
        title=title,
        description=description,
    )


async def search_solutions(title: str, description: str = None) -> str:
    """Delegate to the search agent to find web resources for an issue.

    Use this when the user wants to find online documentation, known bugs,
    Stack Overflow answers, or general web context for a technical problem.

    Args:
        title:       The issue title or search topic.
        description: Optional issue description for additional search context.

    Returns:
        A markdown summary of relevant web findings with source URLs.
    """
    return await run_search(title=title, description=description)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

coordinator = Agent(
    name="coordinator",
    model="gemini-2.5-flash",
    instruction=(
        "You are the main coordinator for a software issue tracking system. "
        "Based on the user's request, delegate to the appropriate specialist agent: "
        "use the issue manager for triage and issue summaries, "
        "the search agent for finding solutions online, "
        "and the resolution agent for full resolution plans. "
        "Always explain which agent you are delegating to and why."
    ),
    tools=[triage_issue, resolve_issue, search_solutions],
)

# ---------------------------------------------------------------------------
# Runner — one shared instance per process
# ---------------------------------------------------------------------------

_session_service = InMemorySessionService()
_runner = Runner(
    agent=coordinator,
    app_name="issue_tracker",
    session_service=_session_service,
)


# ---------------------------------------------------------------------------
# Public coroutine called by the API endpoints
# ---------------------------------------------------------------------------

async def run_coordinator(
    user_message: str,
    issue_id: int | None = None,
    title: str | None = None,
    description: str | None = None,
) -> str:
    """Run the coordinator agent to route a user request to the right specialist.

    Returns the coordinator's response as a markdown string.
    """
    context_lines = []
    if issue_id:
        context_lines.append(f"**Issue ID:** #{issue_id}")
    if title:
        context_lines.append(f"**Title:** {title}")
    if description:
        context_lines.append(f"**Description:** {description}")

    context_block = (
        "\n\n**Issue context:**\n" + "\n".join(context_lines)
        if context_lines
        else ""
    )

    prompt = f"{user_message}{context_block}"

    session = await _session_service.create_session(
        app_name="issue_tracker",
        user_id="api_coordinator",
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)],
    )

    final_text = ""
    async for event in _runner.run_async(
        user_id="api_coordinator",
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text

    return final_text or "Agent returned no response."
