"""Development-only: wipe site DB and reinstall schema (uses site DB user, not MariaDB root)."""

import frappe


def fresh_start(confirm: str = ""):
    if (confirm or "").strip().upper() != "YES":
        return {"ok": False, "message": 'Use fresh_start_yes or pass confirm="YES".'}
    return _do_fresh_start()


def fresh_start_yes():
    """bench --site scout.localhost execute scout.api.dev_reset_site.fresh_start_yes"""
    return _do_fresh_start()


def _do_fresh_start():
    from frappe.installer import install_app, install_db

    site = frappe.local.site
    admin_password = frappe.conf.get("admin_password") or "Admin@123"
    installed = list(frappe.get_installed_apps()) or ["frappe", "scout"]

    install_db(
        frappe.conf.db_name,
        reinstall=True,
        force=True,
        verbose=True,
        admin_password=admin_password,
        db_password=frappe.conf.db_password,
        db_type=frappe.conf.db_type or "mariadb",
        db_host=frappe.conf.db_host,
        db_port=frappe.conf.db_port,
        db_socket=getattr(frappe.conf, "db_socket", None),
    )

    frappe.clear_cache()

    for app in installed:
        if app == "frappe":
            continue
        try:
            install_app(app, verbose=False, force=True)
        except Exception:
            install_app(app, verbose=False)

    frappe.clear_cache()

    try:
        from scout.bootstrap import force_sync_scout_doctypes

        force_sync_scout_doctypes()
    except Exception:
        pass

    frappe.db.commit()

    return {
        "ok": True,
        "message": (
            f"Site {site} database reinstalled. Administrator password: {admin_password}. "
            "Run: bench --site scout.localhost migrate && bench --site scout.localhost clear-cache. "
            "Clear browser localStorage before signing in."
        ),
    }
