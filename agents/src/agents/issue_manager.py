import os
from datetime import datetime

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from src.services import db_service

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

async def get_issue(issue_id: int) -> str:
    """Fetch a single issue by its numeric ID and return its full details.

    Args:
        issue_id: The integer ID of the issue to retrieve.

    Returns:
        A formatted string with issue details, or a not-found message.
    """
    issue = await db_service.get_issue(issue_id)
    if not issue:
        return f"Issue #{issue_id} not found."

    return (
        f"Issue #{issue['id']}: {issue['title']}\n"
        f"Status:   {issue['status']}\n"
        f"Priority: {issue['priority']}\n"
        f"Reporter: {issue.get('reporter_username') or '—'}\n"
        f"Assignee: {issue.get('assignee_username') or 'Unassigned'}\n"
        f"Created:  {_fmt_date(issue.get('created_at'))}\n"
        f"Updated:  {_fmt_date(issue.get('updated_at'))}\n"
        f"Description:\n{issue.get('description') or 'No description provided.'}"
    )


async def list_issues(
    status: str = None,
    priority: str = None,
    limit: int = 10,
) -> str:
    """List issues from the database with optional filters.

    Args:
        status:   Filter by status — one of: open, in_progress, resolved, closed.
        priority: Filter by priority — one of: low, medium, high, critical.
        limit:    Maximum number of issues to return (default 10, max 50).

    Returns:
        A formatted list of matching issues, or a message if none are found.
    """
    limit = min(int(limit), 50)

    where_parts = []
    params: list = []
    idx = 1

    if status:
        where_parts.append(f"i.status = ${idx}")
        params.append(status)
        idx += 1

    if priority:
        where_parts.append(f"i.priority = ${idx}")
        params.append(priority)
        idx += 1

    params.append(limit)
    where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    conn = await db_service.get_connection()
    try:
        rows = await conn.fetch(
            f"""
            SELECT
                i.id, i.title, i.status, i.priority, i.created_at,
                assignee.username AS assignee,
                reporter.username AS reporter
            FROM issues i
            LEFT JOIN users assignee ON i.assignee_id = assignee.id
            LEFT JOIN users reporter ON i.reporter_id = reporter.id
            {where_clause}
            ORDER BY i.created_at DESC
            LIMIT ${idx}
            """,
            *params,
        )
    finally:
        await conn.close()

    issues = [dict(r) for r in rows]
    if not issues:
        return "No issues found matching those filters."

    lines = [f"Found {len(issues)} issue(s):"]
    for i in issues:
        assignee = i.get("assignee") or "Unassigned"
        lines.append(
            f"  #{i['id']}: {i['title']} "
            f"[{i['status']} / {i['priority']}] — Assignee: {assignee}"
        )
    return "\n".join(lines)


async def create_issue_summary(issue_id: int) -> str:
    """Create a detailed markdown summary of an issue including comments and labels.

    Args:
        issue_id: The integer ID of the issue to summarise.

    Returns:
        A markdown-formatted summary string, or a not-found message.
    """
    issue = await db_service.get_issue(issue_id)
    if not issue:
        return f"Issue #{issue_id} not found."

    conn = await db_service.get_connection()
    try:
        comments = await conn.fetch(
            """
            SELECT c.content, c.created_at, u.username
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.issue_id = $1
            ORDER BY c.created_at ASC
            """,
            issue_id,
        )
        labels = await conn.fetch(
            """
            SELECT l.name, l.color
            FROM labels l
            JOIN issue_labels il ON l.id = il.label_id
            WHERE il.issue_id = $1
            """,
            issue_id,
        )
    finally:
        await conn.close()

    label_str = ", ".join(r["name"] for r in labels) if labels else "None"

    lines = [
        f"## Issue #{issue['id']}: {issue['title']}",
        "",
        f"**Status:** {issue['status']}  ",
        f"**Priority:** {issue['priority']}  ",
        f"**Labels:** {label_str}  ",
        f"**Reporter:** {issue.get('reporter_username') or '—'}  ",
        f"**Assignee:** {issue.get('assignee_username') or 'Unassigned'}  ",
        f"**Created:** {_fmt_date(issue.get('created_at'))}  ",
        f"**Updated:** {_fmt_date(issue.get('updated_at'))}  ",
        "",
        "### Description",
        issue.get("description") or "_No description provided._",
        "",
        f"### Comments ({len(comments)})",
    ]

    if comments:
        for c in comments:
            lines.append(
                f"- **{c['username']}** ({_fmt_date(c['created_at'])}): {c['content']}"
            )
    else:
        lines.append("_No comments yet._")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

issue_manager = Agent(
    name="issue_manager",
    model="gemini-2.5-flash",
    instruction=(
        "You are an issue management assistant. "
        "You help users understand, summarize, and navigate software issues stored in the database."
    ),
    tools=[get_issue, list_issues, create_issue_summary],
)

# ---------------------------------------------------------------------------
# Runner — one shared instance per process
# ---------------------------------------------------------------------------

_session_service = InMemorySessionService()
_runner = Runner(
    agent=issue_manager,
    app_name="issue_tracker",
    session_service=_session_service,
)


# ---------------------------------------------------------------------------
# Public coroutine called by the API endpoints
# ---------------------------------------------------------------------------

async def run_triage(title: str, description: str | None) -> str:
    """Run the issue_manager agent to triage a new issue.

    Returns the agent's triage suggestion as a markdown string.
    """
    desc = description or "No description provided."
    prompt = (
        f"A new issue has been submitted. Please triage it.\n\n"
        f"**Title:** {title}\n"
        f"**Description:** {desc}\n\n"
        f"Use the list_issues tool to review recent issues for context, then respond with:\n"
        f"1. Suggested **priority** (low / medium / high / critical)\n"
        f"2. **Category** (e.g. bug, feature, security, performance, docs)\n"
        f"3. **Suggested assignee** if any existing assignee is a good fit, otherwise 'Unassigned'\n"
        f"4. A brief **rationale** (2–3 sentences)\n"
    )

    session = await _session_service.create_session(
        app_name="issue_tracker",
        user_id="api_triage",
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)],
    )

    final_text = ""
    async for event in _runner.run_async(
        user_id="api_triage",
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text

    return final_text or "Agent returned no response."
