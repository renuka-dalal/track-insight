import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


async def get_connection() -> asyncpg.Connection:
    return await asyncpg.connect(DATABASE_URL)


async def get_issue(issue_id: int) -> dict | None:
    conn = await get_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT
                i.*,
                reporter.username  AS reporter_username,
                reporter.full_name AS reporter_name,
                assignee.username  AS assignee_username,
                assignee.full_name AS assignee_name
            FROM issues i
            LEFT JOIN users reporter ON i.reporter_id = reporter.id
            LEFT JOIN users assignee ON i.assignee_id = assignee.id
            WHERE i.id = $1
            """,
            issue_id,
        )
        return dict(row) if row else None
    finally:
        await conn.close()


async def get_all_issues() -> list[dict]:
    conn = await get_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT
                i.id, i.title, i.status, i.priority,
                i.created_at, i.updated_at,
                assignee.username AS assignee,
                reporter.username AS reporter
            FROM issues i
            LEFT JOIN users assignee ON i.assignee_id = assignee.id
            LEFT JOIN users reporter ON i.reporter_id = reporter.id
            ORDER BY i.created_at DESC
            """
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def get_recent_issues(limit: int = 10) -> list[dict]:
    conn = await get_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT
                i.id, i.title, i.status, i.priority,
                i.created_at, i.updated_at,
                assignee.username AS assignee,
                reporter.username AS reporter
            FROM issues i
            LEFT JOIN users assignee ON i.assignee_id = assignee.id
            LEFT JOIN users reporter ON i.reporter_id = reporter.id
            ORDER BY i.created_at DESC
            LIMIT $1
            """,
            limit,
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def get_similar_issues(title: str, description: str | None = None) -> list[dict]:
    conn = await get_connection()
    try:
        search_term = f"%{title}%"
        desc_term = f"%{description}%" if description else search_term

        rows = await conn.fetch(
            """
            SELECT
                i.id, i.title, i.status, i.priority,
                i.description, i.created_at,
                assignee.username AS assignee
            FROM issues i
            LEFT JOIN users assignee ON i.assignee_id = assignee.id
            WHERE
                i.title       ILIKE $1 OR
                i.description ILIKE $2
            ORDER BY i.updated_at DESC
            LIMIT 10
            """,
            search_term,
            desc_term,
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()
