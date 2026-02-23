import os

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search
from google.genai import types as genai_types

# google-genai reads GOOGLE_API_KEY; map GEMINI_API_KEY as a fallback
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_query(title: str, description: str | None) -> str:
    """Combine title and a short description excerpt into a focused search query."""
    if not description:
        return title
    excerpt = description.replace("\n", " ").strip()[:150]
    return f"{title} {excerpt}".strip()


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

search_agent = Agent(
    name="search_agent",
    model="gemini-2.5-flash",
    instruction=(
        "You are a technical search assistant. "
        "Given a software issue title and description, search the web for relevant solutions, "
        "known bugs, documentation, or Stack Overflow answers. "
        "Always return a concise summary with source URLs."
    ),
    tools=[google_search],
)

# ---------------------------------------------------------------------------
# Runner — one shared instance per process
# ---------------------------------------------------------------------------

_session_service = InMemorySessionService()
_runner = Runner(
    agent=search_agent,
    app_name="issue_tracker",
    session_service=_session_service,
)


# ---------------------------------------------------------------------------
# Public coroutine called by the API endpoints
# ---------------------------------------------------------------------------

async def run_search(title: str, description: str | None) -> str:
    """Run the search_agent to find web resources relevant to a software issue.

    Returns the agent's summary and source URLs as a markdown string.
    """
    query = _build_query(title, description)
    prompt = (
        f"Search for solutions or context for the following software issue:\n\n"
        f"**Title:** {title}\n"
        f"**Search query:** {query}\n\n"
        f"Use the google_search tool to find relevant results, then respond with:\n"
        f"1. A concise **summary** of the most useful findings (3–5 bullet points)\n"
        f"2. A **Sources** section listing each source as a markdown link\n\n"
        f"**Strict source formatting rules:**\n"
        f"- Every source MUST include the full https:// URL\n"
        f"- Format each source exactly as: [Source Title](https://full-url-here) — short description\n"
        f"- If a full URL is not available for a source, omit that source entirely\n"
        f"- You MUST return a minimum of 3 sources with valid https:// URLs\n"
        f"- Do NOT use placeholder URLs, shortened URLs, or URLs without the https:// scheme\n"
    )

    session = await _session_service.create_session(
        app_name="issue_tracker",
        user_id="api_search",
    )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=prompt)],
    )

    final_text = ""
    async for event in _runner.run_async(
        user_id="api_search",
        session_id=session.id,
        new_message=content,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = event.content.parts[0].text

    return final_text or "Agent returned no response."
