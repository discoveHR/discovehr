"""Shared helpers for large IN-list queries and chunked frappe.get_all."""

from __future__ import annotations

from typing import Callable, Iterable, TypeVar

import frappe

T = TypeVar("T")

DEFAULT_IN_CHUNK_SIZE = 200


def chunk_list(items: Iterable[T], size: int = DEFAULT_IN_CHUNK_SIZE) -> list[list[T]]:
    """Split an iterable into fixed-size lists (MySQL IN-list safe size)."""
    chunk: list[T] = []
    chunks: list[list[T]] = []
    for item in items:
        chunk.append(item)
        if len(chunk) >= size:
            chunks.append(chunk)
            chunk = []
    if chunk:
        chunks.append(chunk)
    return chunks


def get_all_chunked(
    doctype: str,
    student_ids: Iterable[str],
    *,
    filters_extra: dict | None = None,
    fields: list[str] | None = None,
    order_by: str | None = None,
    limit_per_chunk: int = 5000,
    chunk_size: int = DEFAULT_IN_CHUNK_SIZE,
) -> list[dict]:
    """Run frappe.get_all with student_user IN (...) in chunks and merge rows."""
    ids = [s for s in student_ids if s]
    if not ids:
        return []

    merged: list[dict] = []
    for chunk in chunk_list(ids, chunk_size):
        filters = {"student_user": ["in", chunk]}
        if filters_extra:
            filters.update(filters_extra)
        merged.extend(
            frappe.get_all(
                doctype,
                filters=filters,
                fields=fields,
                order_by=order_by,
                limit_page_length=limit_per_chunk,
            )
        )
    return merged


def pluck_distinct_chunked(
    doctype: str,
    field: str,
    student_ids: Iterable[str],
    *,
    filters_extra: dict | None = None,
    limit_per_chunk: int = 2000,
    chunk_size: int = DEFAULT_IN_CHUNK_SIZE,
) -> list:
    """Distinct pluck across chunked IN queries."""
    seen: set = set()
    out: list = []
    for chunk in chunk_list([s for s in student_ids if s], chunk_size):
        filters = {"student_user": ["in", chunk]}
        if filters_extra:
            filters.update(filters_extra)
        for val in frappe.get_all(
            doctype,
            filters=filters,
            pluck=field,
            distinct=True,
            limit_page_length=limit_per_chunk,
        ):
            if val and val not in seen:
                seen.add(val)
                out.append(val)
    return out


def map_by_field(rows: list[dict], field: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in rows:
        key = row.get(field)
        if key:
            out[key] = row
    return out


def for_each_chunk(
    items: Iterable[str],
    chunk_size: int,
    fn: Callable[[list[str]], None],
) -> None:
    for chunk in chunk_list(items, chunk_size):
        if chunk:
            fn(chunk)
