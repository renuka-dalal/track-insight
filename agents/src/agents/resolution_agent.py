import os
from datetime import datetime

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from src.services import db_service
from src.agents.search_agent import run_search

# google-genai reads GOOGLE_API_KEY; map GEMINI_API_KEY as a fallback
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_date(val) -> str:
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M")
    return str(val) if val else "—"


# ---------------------------------------------------------------------------
# Tools — async functions; ADK's runner awaits them during execution
# ---------------------------------------------------------------------------

async def get_issue_details(issue_id: int) -> str:
    """Fetch full details of a single issue by its numeric ID.

    Args:
        issue_id: The integer ID of the issue to retrieve.

    Returns:
        A formatted string with the issue's full details, or a not-found message.
    """
    issue = await db_service.get_issue(issue_id)
    if not issue:
        return f"Issue #{issue_id} not found."

    return (
        f"Issue #{issue['id']}: {issue['title']}\n"
        f"Status:      {issue['status']}\n"
        f"Priority:    {issue['priority']}\n"
        f"Reporter:    {issue.get('reporter_username') or '—'}\n"
        f"Assignee:    {issue.get('assignee_username') or 'Unassigned'}\n"
        f"Created:     {_fmt_date(issue.get('created_at'))}\n"
        f"Updated:     {_fmt_date(issue.get('updated_at'))}\n"
        f"Description:\n{issue.get('description') or 'No description provided.'}"
    )


async def get_similar_issues(title: str, description: str) -> str:
    """Search the database for issues similar to the given title and description.

    Prioritises resolved and closed issues as they may contain useful solutions.

    Args:
        title:       The issue title to search for.
        description: The issue description to search for.

    Returns:
        A formatted list of similar issues, noting their resolution status.
    """
    issues = await db_service.get_similar_issues(title, description)
    if not issues:
        return "No similar issues found in the database."

    # Surface resolved/closed issues first — they are the most actionable
    resolved = [i for i in issues if i.get("status") in ("resolved", "closed")]
    other = [i for i in issues if i.get("status") not in ("resolved", "closed")]
    ordered = resolved + other

    lines = [f"Found {len(ordered)} similar issue(s) (resolved/closed listed first):"]
    for i in ordered:
        assignee = i.get("assignee") or "Unassigned"
        desc_excerpt = (i.get("description") or "")[:120].replace("\n", " ")
        lines.append(
            f"\n  #{i['id']}: {i['title']}\n"
            f"    Status: {i['status']} | Priority: {i['priority']} | Assignee: {assignee}\n"
            f"    Created: {_fmt_date(i.get('created_at'))}\n"
            f"    Description: {desc_excerpt}{'...' if len(i.get('description') or '') > 120 else ''}"
        )
    return "\n".join(lines)


async def search_for_solutions(title: str, description: str) -> str:
    """Search the web for solutions, documentation, or known fixes related to the issue.

    Args:
        title:       The issue title to search for.
        description: The issue description to provide additional search context.

    Returns:
        A markdown summary of relevant web findings with source URLs.
    """
    return await run_search(title=title, description=description)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

resolution_agent = Agent(
    name="resolution_agent",
    model="gemini-2.5-flash",
    instruction=(
        "You are an expert software issue resolution assistant. "
        "Given an issue, you analyze it, look for similar past resolved issues, "
        "search for solutions online, and produce a structured resolution plan."
    ),
    tools=[get_issue_details, get_similar_issues, search_for_solutions],
)

# ---------------------------------------------------------------------------
# Runner — one shared instance per process
# ---------------------------------------------------------------------------

_session_service = InMemorySessionService()
_runner = Runner(
    agent=resolution_agent,
    app_name="issue_tracker",
    session_service=_session_service,
)


# ---------------------------------------------------------------------------
# Public coroutine called by the API endpoints
# ---------------------------------------------------------------------------

async def run_resolution(issue_id: int | None, title: str, description: str | None) -> str:
    """Run the resolution_agent to produce a structured fix plan for an issue.

    Returns a markdown string with Root Cause Analysis, Similar Past Issues,
    Suggested Fix, and References sections.
    """
    desc = description or "No description provided."

    issue_context = (
        f"Issue ID: #{issue_id}\n" if issue_id else ""
    )

    prompt = (
        f"Produce a resolution plan for the following software issue.\n\n"
        f"{issue_context}"
        f"**Title:** {title}\n"
        f"**Description:** {desc}\n\n"
        f"Follow these steps in order:\n"
        f"1. Call `get_issue_details` (if an issue ID was provided) to retrieve the full record.\n"
        f"2. Call `get_similar_issues` with the title and description to find past resolved issues.\n"
        f"3. Call `search_for_solutions` with the title and description to find web resources.\n\n"
        f"Then produce a response using **exactly** these markdown sections:\n\n"
        f"## Root Cause Analysis\n"
        f"Based on the issue details and similar past issues, identify the most likely root cause.\n\n"
        f"## Similar Past Issues\n"
        f"List any matching issues from the database, noting how they were resolved.\n\n"
        f"## Suggested Fix\n"
        f"Provide a concrete, step-by-step remediation plan.\n\n"
        f"## References\n"
        f"List all relevant URLs and sources found during the web search.\n"
    )

    session = await _session_service.create_session(
        app_name="issue_tracker",
        user_id="api_resolve",
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)],
    )

    final_text = ""
    async for event in _runner.run_async(
        user_id="api_resolve",
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text

    return final_text or "Agent returned no response."
