"""
Frappe RPC: ``scout.api.company_freelancer_api.*``

Dedicated entry points for the company freelancer interviewer directory
(avoid stale ``company_api`` module cache on long-running bench processes).
"""

import frappe

from scout.api.company.freelancer_interviewers import (
    get_freelancer_interviewer_detail as _get_freelancer_interviewer_detail,
    list_approved_freelancer_interviewers as _list_approved_freelancer_interviewers,
)


@frappe.whitelist(methods=["GET"])
def list_approved_freelancer_interviewers():
    return _list_approved_freelancer_interviewers()


@frappe.whitelist(methods=["GET"])
def get_freelancer_interviewer_detail():
    return _get_freelancer_interviewer_detail()


__all__ = [
    "get_freelancer_interviewer_detail",
    "list_approved_freelancer_interviewers",
]
