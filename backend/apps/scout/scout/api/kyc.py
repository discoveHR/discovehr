"""KYC — SurePass Aadhaar OTP verification."""
import json

import frappe
import requests
from frappe import _

from scout.api.common import get_student_session_user
from scout.utils.env_config import scout_conf

_TIMEOUT = 15  # seconds


def _sp_base() -> str:
    return scout_conf("scout_surepass_base_url", "SCOUT_SUREPASS_BASE_URL").rstrip("/")


def _sp_token() -> str:
    return scout_conf("scout_surepass_token", "SCOUT_SUREPASS_TOKEN")


def _sp_headers() -> dict:
    return {
        "Authorization": f"Bearer {_sp_token()}",
        "Content-Type": "application/json",
    }


@frappe.whitelist(methods=["POST"])
def generate_aadhaar_otp():
    """Send an OTP to the mobile number linked with the given Aadhaar.

    Returns ``{ ok, client_id }`` on success.
    """
    user, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    aadhaar_number = (payload.get("aadhaar_number") or "").strip().replace(" ", "")
    if len(aadhaar_number) != 12 or not aadhaar_number.isdigit():
        frappe.throw(_("Invalid Aadhaar number — must be 12 digits."))

    base = _sp_base()
    if not base or not _sp_token():
        frappe.throw(_("SurePass KYC integration is not configured."))

    try:
        resp = requests.post(
            f"{base}/api/v1/aadhaar-v2/generate-otp",
            headers=_sp_headers(),
            json={"id_number": aadhaar_number},
            timeout=_TIMEOUT,
        )
        data = resp.json()
    except requests.RequestException as exc:
        frappe.log_error(str(exc), "SurePass generate_otp network error")
        frappe.throw(_("KYC service unreachable. Please try again later."))

    if not resp.ok or data.get("status_code") not in (101, 200, None):
        msg = (data.get("message") or data.get("error") or "OTP generation failed.")
        frappe.log_error(json.dumps(data), "SurePass generate_otp error")
        frappe.throw(_(str(msg)))

    client_id = (data.get("data") or {}).get("client_id") or data.get("client_id")
    if not client_id:
        frappe.throw(_("OTP sent but no client_id returned — contact support."))

    return {"ok": True, "data": {"client_id": client_id}}


@frappe.whitelist(methods=["POST"])
def verify_aadhaar_otp():
    """Verify the OTP returned by ``generate_aadhaar_otp``.

    On success: saves ``aadhaar_verified = 1`` to the student profile and
    returns ``{ ok, message, data }`` with the masked Aadhaar details.
    """
    user, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    client_id = (payload.get("client_id") or "").strip()
    otp = (payload.get("otp") or "").strip()
    if not client_id or not otp:
        frappe.throw(_("client_id and otp are required."))

    base = _sp_base()
    if not base or not _sp_token():
        frappe.throw(_("SurePass KYC integration is not configured."))

    try:
        resp = requests.post(
            f"{base}/api/v1/aadhaar-v2/submit-otp",
            headers=_sp_headers(),
            json={"client_id": client_id, "otp": otp},
            timeout=_TIMEOUT,
        )
        data = resp.json()
    except requests.RequestException as exc:
        frappe.log_error(str(exc), "SurePass submit_otp network error")
        frappe.throw(_("KYC service unreachable. Please try again later."))

    if not resp.ok or data.get("status_code") not in (101, 200, None):
        msg = data.get("message") or data.get("error") or "OTP verification failed."
        frappe.throw(_(str(msg)))

    # Mark student as Aadhaar-verified (doc name == user_id in this doctype)
    if frappe.db.exists("Scout Student Profile", user):
        frappe.db.set_value("Scout Student Profile", user, "aadhaar_verified", 1)
        frappe.db.commit()

    sp_data = data.get("data") or {}
    return {
        "ok": True,
        "message": "Aadhaar verified successfully.",
        "data": {
            "name": sp_data.get("full_name") or sp_data.get("name"),
            "maskedAadhaar": sp_data.get("aadhaar_number"),
            "dob": sp_data.get("dob"),
            "gender": sp_data.get("gender"),
            "address": sp_data.get("address"),
            "photo": sp_data.get("photo"),
        },
    }
