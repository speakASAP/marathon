#!/usr/bin/env python3
"""Read-only source contract checker for Marathon hosted Auth integration.

This checker intentionally reads source files only. It does not import Marathon
application code, call services, read env files, query databases, or mutate state.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]

AUTH_TS = REPO_ROOT / "frontend" / "src" / "auth.ts"
REGISTRATION_FORM = REPO_ROOT / "frontend" / "src" / "components" / "RegistrationForm.tsx"
JOURNEY_API = REPO_ROOT / "frontend" / "src" / "api" / "journeyMarathon.ts"
REGISTRATION_SERVICE = REPO_ROOT / "src" / "registrations" / "registrations.service.ts"
PACKAGE_JSON = REPO_ROOT / "package.json"

SOURCE_SCAN_ROOTS = [
    REPO_ROOT / "frontend" / "src",
    REPO_ROOT / "src",
    REPO_ROOT / "scripts",
]

SELF_PATH = Path(__file__).resolve()
FORBIDDEN_LOCAL_AUTH_PATTERNS = [
    ("contact-code", re.compile(r"contact[-_/]?code", re.IGNORECASE)),
    ("passwordless", re.compile(r"passwordless", re.IGNORECASE)),
    ("one-time-code", re.compile(r"one[-_ ]?time[-_ ]?(code|password|passcode)", re.IGNORECASE)),
    ("otp", re.compile(r"\botp\b", re.IGNORECASE)),
    ("verification-code-handler", re.compile(r"verification[-_ ]?code", re.IGNORECASE)),
]


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


def check_hosted_auth_redirects(checks: list[Check]) -> None:
    text = read_text(AUTH_TS)
    missing = contains_all(
        text,
        [
            "https://auth.alfares.cz/login",
            "https://auth.alfares.cz/register",
            "return_url",
            "client_id",
            "marathon",
            "VITE_AUTH_LOGIN_URL",
            "VITE_AUTH_REGISTER_URL",
        ],
    )
    login_auth_index = text.find("VITE_AUTH_LOGIN_URL")
    login_portal_index = text.find("VITE_PORTAL_LOGIN_URL")
    auth_before_portal = login_auth_index != -1 and login_portal_index != -1 and login_auth_index < login_portal_index
    client_only_for_hosted = "usesLegacyPortal" in text and "url.searchParams.set('client_id'" in text
    add_check(
        checks,
        "hosted-auth-redirect-contract",
        not missing and auth_before_portal and client_only_for_hosted,
        "Login/register redirects use hosted Auth with return_url and client_id=marathon before legacy portal fallback.",
        [rel(AUTH_TS)] + ([f"missing={missing}"] if missing else []),
    )


def check_fragment_handoff(checks: list[Check]) -> None:
    text = read_text(AUTH_TS)
    required = [
        "access_token",
        "refresh_token",
        "const plainAnchor =",
        "const hashQuery =",
        "new URLSearchParams(hashQuery)",
        "hashParams.delete(key)",
        "window.history.replaceState",
        "setToken(token)",
    ]
    missing = contains_all(text, required)
    refresh_sanitized = bool(re.search(r"AUTH_HANDOFF_HASH_PARAMS[\s\S]+?refresh_token", text))
    legacy_allowed = "marathon_token" in text and "LEGACY_URL_PARAM" in text
    add_check(
        checks,
        "hosted-auth-fragment-handoff",
        not missing and refresh_sanitized and legacy_allowed,
        "Hosted Auth access_token is captured, refresh_token/auth fragment keys are sanitized, and marathon_token fallback remains allowed.",
        [rel(AUTH_TS)] + ([f"missing={missing}"] if missing else []),
    )


def check_phone_required(checks: list[Check]) -> None:
    form = read_text(REGISTRATION_FORM)
    service = read_text(REGISTRATION_SERVICE)
    form_ok = all(
        needle in form
        for needle in [
            "if (!phone.trim())",
            "Укажите телефон",
            'id="reg-phone"',
            "required",
            "phone: phone.trim() || undefined",
        ]
    )
    service_ok = all(
        needle in service
        for needle in [
            "const phone = payload.phone?.trim() || ''",
            "if (!phone)",
            "Phone is required",
            "registerMarathonContact({ email, phone, name })",
        ]
    )
    add_check(
        checks,
        "transitional-direct-registration-phone-required",
        form_ok and service_ok,
        "Direct Marathon registration still requires phone in the frontend and backend contact-provisioning path.",
        [rel(REGISTRATION_FORM), rel(REGISTRATION_SERVICE)],
    )


def check_existing_account_ui(checks: list[Check]) -> None:
    form = read_text(REGISTRATION_FORM)
    api = read_text(JOURNEY_API)
    service = read_text(REGISTRATION_SERVICE)
    required_form = [
        "MarathonRegistrationExistingAccountError",
        "existingAccountMessage",
        "getLoginUrl",
        "getPasswordResetUrl",
        "Войти с email или телефоном",
        "Восстановить пароль",
    ]
    required_api = ["EXISTING_MARATHON_ACCOUNT", "loginRequired", "MarathonRegistrationExistingAccountError"]
    required_service = ["EXISTING_MARATHON_ACCOUNT", "EXISTING_AUTH_ACCOUNT", "loginRequired: true"]
    missing = contains_all(form, required_form) + contains_all(api, required_api) + contains_all(service, required_service)
    add_check(
        checks,
        "existing-account-login-reset-ui",
        not missing,
        "Existing-account conflicts surface login and password-reset options instead of continuing local registration.",
        [rel(REGISTRATION_FORM), rel(JOURNEY_API), rel(REGISTRATION_SERVICE)] + ([f"missing={missing}"] if missing else []),
    )


def iter_source_files() -> Iterable[Path]:
    allowed_suffixes = {".ts", ".tsx", ".js", ".jsx", ".json"}
    for root in SOURCE_SCAN_ROOTS:
        if root.is_file():
            paths = [root]
        elif root.exists():
            paths = [path for path in root.rglob("*") if path.is_file()]
        else:
            paths = []
        for path in paths:
            resolved = path.resolve()
            if resolved == SELF_PATH:
                continue
            if "node_modules" in path.parts or "dist" in path.parts or "build" in path.parts:
                continue
            if path.suffix in allowed_suffixes:
                yield path
    if PACKAGE_JSON.exists():
        yield PACKAGE_JSON


def check_forbidden_local_passwordless(checks: list[Check]) -> None:
    findings: list[str] = []
    for path in iter_source_files():
        text = read_text(path)
        for label, pattern in FORBIDDEN_LOCAL_AUTH_PATTERNS:
            if pattern.search(text):
                findings.append(f"{rel(path)}:{label}")
    add_check(
        checks,
        "forbid-local-contact-code-passwordless",
        not findings,
        "Marathon source must not implement local contact-code or passwordless auth; hosted Auth owns that flow.",
        findings,
    )


def check_no_legacy_only_primary_login(checks: list[Check]) -> None:
    text = read_text(AUTH_TS)
    hosted_defaults = "DEFAULT_AUTH_LOGIN_URL = 'https://auth.alfares.cz/login'" in text and "DEFAULT_AUTH_REGISTER_URL = 'https://auth.alfares.cz/register'" in text
    login_auth_index = text.find("VITE_AUTH_LOGIN_URL")
    login_portal_index = text.find("VITE_PORTAL_LOGIN_URL")
    auth_before_portal = login_auth_index != -1 and login_portal_index != -1 and login_auth_index < login_portal_index
    hosted_return = "usesLegacyPortal ? 'next' : 'return_url'" in text
    add_check(
        checks,
        "forbid-legacy-only-speakasap-primary-login",
        hosted_defaults and auth_before_portal and hosted_return,
        "Primary login/register path must be hosted auth.alfares.cz; speakasap.com may remain only as transitional fallback/password reset.",
        [rel(AUTH_TS)],
    )


def run_checks() -> dict[str, object]:
    checks: list[Check] = []
    for path in [AUTH_TS, REGISTRATION_FORM, JOURNEY_API, REGISTRATION_SERVICE]:
        add_check(checks, f"required-file:{rel(path)}", path.exists(), "Required source file exists.", [rel(path)])
    if all(path.exists() for path in [AUTH_TS, REGISTRATION_FORM, JOURNEY_API, REGISTRATION_SERVICE]):
        check_hosted_auth_redirects(checks)
        check_fragment_handoff(checks)
        check_phone_required(checks)
        check_existing_account_ui(checks)
        check_forbidden_local_passwordless(checks)
        check_no_legacy_only_primary_login(checks)

    failed = [check for check in checks if check.status != "pass"]
    return {
        "ok": not failed,
        "checker": "scripts/check-marathon-hosted-auth-contract.py",
        "repoRoot": str(REPO_ROOT),
        "contract": {
            "hostedAuthOrigin": "https://auth.alfares.cz",
            "clientId": "marathon",
            "returnParam": "return_url",
            "tokenFragmentParams": ["access_token", "refresh_token"],
            "legacyFallbackAllowed": "marathon_token",
            "noWrites": True,
        },
        "checks": [check.__dict__ for check in checks],
        "summary": {"total": len(checks), "passed": len(checks) - len(failed), "failed": len(failed)},
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Check Marathon hosted Auth consumer source contract without writes.")
    parser.add_argument("--json-report", metavar="PATH", help="Write JSON report to PATH, or '-' for stdout.")
    args = parser.parse_args(argv)

    report = run_checks()
    output = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
    if args.json_report:
        if args.json_report == "-":
            print(output)
        else:
            Path(args.json_report).write_text(output + "\n", encoding="utf-8")
    else:
        status = "PASS" if report["ok"] else "FAIL"
        print(f"{status} {report['checker']} ({report['summary']['passed']}/{report['summary']['total']} checks passed)")
        for check in report["checks"]:
            print(f"[{check['status']}] {check['name']}: {check['message']}")
            for evidence in check["evidence"]:
                print(f"  - {evidence}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
