from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional, Sequence, TypedDict, cast
from mcp.server.fastmcp import FastMCP

Classification  = Literal['UNCLASSIFIED', 'RESTRICTED', 'SECRET']
Category = Literal['incident', 'threat_report', 'capability_assessment', 'policy']
ConfidenceLevel = Literal['low', 'medium', 'high']

DATA_PATH = Path(__file__).parent / 'data' / 'example.json'

mcp = FastMCP('sl-defence-kb')

class KnowledgeEntry(TypedDict):
    id: str
    category: Category
    title: str
    region: list[str]
    classification: Classification
    confidence: Optional[ConfidenceLevel]
    systems: Optional[list[str]]
    tags: list[str]
    owner: str
    createdAt: str
    lastUpdated: str
    body: str

def load_knowledge_entries() -> list[KnowledgeEntry]:
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return cast(list[KnowledgeEntry], raw)

def classification_rank(c: Classification) -> int:
    return {
        'UNCLASSIFIED': 0,
        'RESTRICTED': 1,
        'SECRET': 2
    }[c]

def matches(knowledge_entry: KnowledgeEntry, query: str) -> bool:
    q = query.lower().strip()
    hay = " ".join([knowledge_entry["title"], knowledge_entry["body"], " ".join(knowledge_entry["tags"])]).lower()
    return q in hay


@mcp.tool()
def def_search(
    query: str,
    classification_max: Classification = "SECRET",
    region: Optional[str] = None,
    category: Optional[Category] = None,
    limit: int = 5,
) -> dict:
    knowledge_entries = load_knowledge_entries()
    max_rank = classification_rank(classification_max)

    results = []
    for k in knowledge_entries:
        if classification_rank(k["classification"]) > max_rank:
            continue
        if category and k["category"] != category:
            continue
        if region and region not in k["region"]:
            continue
        if not matches(k, query):
            continue

        body = k["body"]
        results.append(
            {
                "id": k["id"],
                "title": k["title"],
                "category": k["category"],
                "classification": k["classification"],
                "confidence": k.get("confidence"),
                "region": k["region"],
                "tags": k["tags"],
                "owner": k["owner"],
                "lastUpdated": k["lastUpdated"],
                "snippet": (body[:220] + "…") if len(body) > 220 else body,
            }
        )

    results.sort(key=lambda x: x["lastUpdated"], reverse=True)
    return {"results": results[: max(1, min(limit, 20))]}

@mcp.tool()
def def_get_entry(entry_id: str, classification_max: Classification = "SECRET") -> dict:
    knowledge_entries = load_knowledge_entries()
    max_rank = classification_rank(classification_max)

    e = next((k for k in knowledge_entries if k["id"] == entry_id), None)

    if not e:
        return {"error": f"Entry not found: {entry_id}"}

    if classification_rank(e["classification"]) > max_rank:
        return {"error": f"Entry classification {e['classification']} exceeds maximum allowed {classification_max}"}

    return {"knowledge_entry": e}


@mcp.resource("def://knowledge_entries")
def list_knowledge_entries() -> str:
    knowledge_entries = load_knowledge_entries()
    safe = [
        {
            "id": k["id"],
            "title": k["title"],
            "category": k["category"],
            "classification": k["classification"],
        }
        for k in knowledge_entries
        if k["classification"] == "UNCLASSIFIED"
    ]
    return json.dumps({"knowledge_entries": safe}, indent=2)

if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        mount_path="/mcp",
    )