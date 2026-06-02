"""Serialize freelancer profile child documents (no scout.api.common imports)."""


def serialize_documents(doc):
    rows = []
    for row in doc.get("documents") or []:
        rows.append(
            {
                "name": row.name,
                "documentType": row.document_type or "",
                "description": row.description or "",
                "file": row.file or "",
            }
        )
    return rows
