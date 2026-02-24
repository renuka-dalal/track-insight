import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from src.agents.coordinator import run_coordinator
from src.agents.issue_manager import run_triage
from src.agents.resolution_agent import run_resolution
from src.agents.search_agent import run_search

load_dotenv()

app = FastAPI(title="Issue Tracker Agents", version="1.0.0")


class IssueRequest(BaseModel):
    issue_id: int | None = None
    title: str
    description: str | None = None
    priority: str | None = None
    status: str | None = None


class ChatRequest(BaseModel):
    message: str
    issue_id: int | None = None
    title: str | None = None
    description: str | None = None


class AgentResponse(BaseModel):
    success: bool
    result: str


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/agents/chat", response_model=AgentResponse)
async def chat(request: ChatRequest):
    """Single entry point — coordinator routes the request to the right agent."""
    print(f"[chat] Starting request: {request.message!r}")
    t0 = time.perf_counter()
    try:
        result = await run_coordinator(
            user_message=request.message,
            issue_id=request.issue_id,
            title=request.title,
            description=request.description,
        )
        elapsed = time.perf_counter() - t0
        print(f"[chat] Coordinator completed in {elapsed:.2f}s")
        print(f"[chat] Total request duration: {elapsed:.2f}s")
        return AgentResponse(success=True, result=result)
    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"[chat] Failed after {elapsed:.2f}s — {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/triage", response_model=AgentResponse)
async def triage_issue(request: IssueRequest):
    """Triage a new issue — suggest priority, category, and assignee."""
    print(f"[triage] Starting request: {request.title!r}")
    t0 = time.perf_counter()
    try:
        result = await run_triage(
            title=request.title,
            description=request.description,
        )
        elapsed = time.perf_counter() - t0
        print(f"[triage] Agent completed in {elapsed:.2f}s")
        print(f"[triage] Total request duration: {elapsed:.2f}s")
        return AgentResponse(success=True, result=result)
    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"[triage] Failed after {elapsed:.2f}s — {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/resolve", response_model=AgentResponse)
async def resolve_issue(request: IssueRequest):
    """Produce a structured resolution plan for an issue."""
    print(f"[resolve] Starting request: {request.title!r}")
    t0 = time.perf_counter()
    try:
        result = await run_resolution(
            issue_id=request.issue_id,
            title=request.title,
            description=request.description,
        )
        elapsed = time.perf_counter() - t0
        print(f"[resolve] Agent completed in {elapsed:.2f}s")
        print(f"[resolve] Total request duration: {elapsed:.2f}s")
        return AgentResponse(success=True, result=result)
    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"[resolve] Failed after {elapsed:.2f}s — {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/search", response_model=AgentResponse)
async def search_related(request: IssueRequest):
    """Search the web for solutions and context relevant to an issue."""
    print(f"[search] Starting request: {request.title!r}")
    t0 = time.perf_counter()
    try:
        result = await run_search(
            title=request.title,
            description=request.description,
        )
        elapsed = time.perf_counter() - t0
        print(f"[search] Agent completed in {elapsed:.2f}s")
        print(f"[search] Total request duration: {elapsed:.2f}s")
        return AgentResponse(success=True, result=result)
    except Exception as e:
        elapsed = time.perf_counter() - t0
        print(f"[search] Failed after {elapsed:.2f}s — {e}")
        raise HTTPException(status_code=500, detail=str(e))
