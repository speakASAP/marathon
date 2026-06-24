#!/usr/bin/env python3
"""Read-only source contract checker for Marathon admin pricing.

This checker reads source files only. It does not call services, read env files,
query databases, or mutate Marathon prices.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]

ADMIN_BASE_CONTROLLER = REPO_ROOT / "src" / "admin" / "admin.controller.ts"
ADMIN_CONTROLLER = REPO_ROOT / "src" / "admin" / "admin-pricing.controller.ts"
ADMIN_SERVICE = REPO_ROOT / "src" / "admin" / "admin-pricing.service.ts"
ADMIN_MODULE = REPO_ROOT / "src" / "admin" / "admin.module.ts"
APP_MODULE = REPO_ROOT / "src" / "app.module.ts"
ADMIN_API = REPO_ROOT / "frontend" / "src" / "api" / "adminMarathon.ts"
PROFILE_PAGE = REPO_ROOT / "frontend" / "src" / "pages" / "Profile.tsx"
ADMIN_PAGE = REPO_ROOT / "frontend" / "src" / "pages" / "AdminMarathonPrices.tsx"
APP_TSX = REPO_ROOT / "frontend" / "src" / "App.tsx"
PACKAGE_JSON = REPO_ROOT / "package.json"


@dataclass
class Check:
    name: str
    status: str
    message: str
    evidence: list[str]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def rel(path: Path) -> str:
    return str(path.relative_to(REPO_ROOT))


def contains_all(text: str, needles: Iterable[str]) -> list[str]:
    return [needle for needle in needles if needle not in text]


def add_check(checks: list[Check], name: str, ok: bool, message: str, evidence: Iterable[str] = ()) -> None:
    checks.append(Check(name=name, status="pass" if ok else "fail", message=message, evidence=list(evidence)))


def check_admin_api_contract(checks: list[Check]) -> None:
    base_controller = read_text(ADMIN_BASE_CONTROLLER)
    controller = read_text(ADMIN_CONTROLLER)
    service = read_text(ADMIN_SERVICE)
    module = read_text(ADMIN_MODULE)
    app = read_text(APP_MODULE)
    required_controller = [
        "@Controller('admin/marathons/prices')",
        "@UseGuards(AuthGuard)",
        "@Get()",
        "@Patch()",
        "req.user!",
        "updateAllActiveMarathonPrices",
    ]
    required_service = [
        "MARATHON_ADMIN_USER_IDS",
        "MARATHON_ADMIN_EMAILS",
        "ForbiddenException",
        "parsePrice",
        "expectedActiveCount",
        "this.prisma.$transaction",
        "marathon: { active: true }",
        "price",
        "currency",
    ]
    required_module = ["AdminPricingController", "AdminPricingService", "PrismaService"]
    required_app = ["AdminModule"]
    missing = (
        contains_all(controller, required_controller)
        + contains_all(service, required_service)
        + contains_all(module, required_module)
        + contains_all(app, required_app)
    )
    add_check(
        checks,
        "admin-pricing-api-contract",
        not missing,
        "Admin pricing API is AuthGuard-protected, env allowlist-backed, and updates only active MarathonProduct price/currency rows.",
        [rel(ADMIN_CONTROLLER), rel(ADMIN_SERVICE), rel(ADMIN_MODULE), rel(APP_MODULE)] + ([f"missing={missing}"] if missing else []),
    )


def check_admin_frontend_contract(checks: list[Check]) -> None:
    api = read_text(ADMIN_API)
    page = read_text(ADMIN_PAGE)
    app = read_text(APP_TSX)
    required_api = [
        "authFetch('/api/v1/admin/marathons/prices')",
        "method: 'PATCH'",
        "AdminMarathonPricingError",
        "expectedActiveCount",
    ]
    required_page = [
        "fetchAdminMarathonPrices",
        "updateAllAdminMarathonPrices",
        "getLoginUrl('/admin/marathons/prices')",
        "PRICE_PATTERN",
        "expectedActiveCount: catalog.activeCount",
        "Цена обновлена",
    ]
    required_app = [
        "AdminMarathonPrices",
        'path="/admin/marathons/prices"',
    ]
    missing = contains_all(api, required_api) + contains_all(page, required_page) + contains_all(app, required_app)
    add_check(
        checks,
        "admin-pricing-frontend-contract",
        not missing,
        "Admin pricing page fetches the protected API, validates price/currency locally, and sends active-count guard data.",
        [rel(ADMIN_API), rel(ADMIN_PAGE), rel(APP_TSX)] + ([f"missing={missing}"] if missing else []),
    )


def check_payment_integrity_unchanged(checks: list[Check]) -> None:
    service = read_text(ADMIN_SERVICE)
    forbidden = [
        "marathonPaymentAttempt.update",
        "marathonPaymentAttempt.updateMany",
        "marathonParticipant.update",
        "marathonGift.update",
        "checkoutResponse",
        "callbackPayload",
    ]
    present = [needle for needle in forbidden if needle in service]
    add_check(
        checks,
        "payment-integrity-boundary",
        not present,
        "Admin pricing code does not modify participants, gifts, or historical payment attempts.",
        [rel(ADMIN_SERVICE)] + ([f"forbidden={present}"] if present else []),
    )


def check_package_script(checks: list[Check]) -> None:
    package = read_text(PACKAGE_JSON)
    add_check(
        checks,
        "admin-pricing-check-script",
        "check:admin-pricing" in package and "check-marathon-admin-pricing-contract.py" in package,
        "Package exposes the read-only admin pricing source contract checker.",
        [rel(PACKAGE_JSON)],
    )


def run() -> tuple[bool, list[Check]]:
    checks: list[Check] = []
    check_admin_api_contract(checks)
    check_admin_frontend_contract(checks)
    check_payment_integrity_unchanged(checks)
    check_package_script(checks)
    return all(check.status == "pass" for check in checks), checks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-report", action="store_true")
    args = parser.parse_args()
    ok, checks = run()
    report = {
        "ok": ok,
        "checks": [check.__dict__ for check in checks],
    }
    if args.json_report:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        for check in checks:
            print(f"[{check.status.upper()}] {check.name}: {check.message}")
            for evidence in check.evidence:
                print(f"  - {evidence}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
