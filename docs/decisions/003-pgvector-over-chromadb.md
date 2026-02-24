# ADR-003: PostgreSQL with pgvector over a Dedicated Vector Store

## Context

The Resolution Agent and Issue Manager need semantic similarity search to find issues related to a newly submitted one. Plain ILIKE text matching misses semantically related issues with different phrasing (e.g., "login page unresponsive" vs. "authentication endpoint timeout"), so I needed a vector similarity backend. The candidates were pgvector (a Postgres extension), ChromaDB, and Pinecone.

## Decision

PostgreSQL with the `pgvector` extension is used for vector similarity search. Embedding vectors are stored in an `embedding vector(1536)` column on the `issues` table (generated via OpenAI `text-embedding-3-small`). The existing Postgres instance is extended with `pgvector` via a migration — no additional service is introduced. The `get_similar_issues` function uses cosine similarity (`<=>` operator) alongside an ILIKE fallback.

## Consequences

| **Positive** | **Negative** |
|---|---|
| No new infrastructure — the existing Postgres container requires only `CREATE EXTENSION pgvector;` in a migration. | Embedding generation must be triggered on issue create/update, adding latency or requiring a background job. |
| Issues table remains the single source of truth: structured metadata and embeddings are co-located and transactionally consistent. | Postgres image must be switched to `pgvector/pgvector:pg15`. |
| Backups, monitoring, and access control are inherited from the existing Postgres setup. | ANN performance degrades at very high vector counts without index tuning — not a concern now, but worth revisiting past ~1M issues. |
