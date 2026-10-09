"""Presentation integrity checks; browser/playtest evidence is recorded separately."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
PROTECTED_RUNTIME = ("app/engine.js", "app/bots.js")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def run_node(arguments: list[str], script: str | None = None) -> dict:
    try:
        result = subprocess.run(
            ["node", *arguments], cwd=ROOT, input=script,
            text=True, capture_output=True, timeout=30, check=False,
        )
        return {
            "passed": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout.strip()[:4000],
            "stderr": result.stderr.strip()[:4000],
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"passed": False, "error": str(error)}


def verify() -> dict:
    report = {
        "checked_at": datetime.now(timezone(timedelta(hours=7))).isoformat(),
        "root": str(ROOT),
        "scope": "Original Edition presentation integrity, syntax and isolated privacy guards; no browser parity claim.",
        "passed": False,
        "errors": [],
    }

    try:
        audit = load_json(ROOT / ".codex/repository-audit-before.json")
        originals = [item for item in audit["files"] if item["path"].startswith("Assets/")]
        changed = []
        for item in originals:
            path = ROOT / item["path"]
            actual = digest(path) if path.is_file() else None
            if actual != item["sha256"]:
                changed.append({"path": item["path"], "expected": item["sha256"], "actual": actual})
        known = {item["path"] for item in originals}
        current = {path.relative_to(ROOT).as_posix() for path in (ROOT / "Assets").rglob("*") if path.is_file()}
        report["original_assets"] = {
            "baseline": ".codex/repository-audit-before.json",
            "checked": len(originals),
            "expected_count": 351,
            "changed_or_missing": changed,
            "additional_files": sorted(current - known),
            "passed": len(originals) == 351 and len(known) == 351 and not changed,
        }
    except (OSError, ValueError, KeyError, TypeError) as error:
        report["errors"].append(f"Asset baseline check failed: {error}")

    try:
        baseline = load_json(ROOT / ".codex/steam-animation-before.json")
        hashes = {item["path"]: item["sha256"] for item in baseline["runtime_files"]}
        protected = []
        for name in PROTECTED_RUNTIME:
            path = ROOT / name
            expected = hashes.get(name)
            actual = digest(path) if path.is_file() else None
            protected.append({"path": name, "expected": expected, "actual": actual,
                              "passed": expected is not None and expected == actual})
        report["protected_runtime"] = {
            "baseline": ".codex/steam-animation-before.json",
            "files": protected,
            "passed": all(item["passed"] for item in protected),
        }
    except (OSError, ValueError, KeyError, TypeError) as error:
        report["errors"].append(f"Engine/bot baseline check failed: {error}")

    modules = sorted((ROOT / "app/presentation").glob("*.js"))
    syntax = []
    for path in modules:
        name = path.relative_to(ROOT).as_posix()
        syntax.append({"path": name, **run_node(["--check", name])})
    report["presentation_syntax"] = {
        "files": syntax,
        "passed": bool(syntax) and any(path.name == "card-art.js" for path in modules)
        and all(item["passed"] for item in syntax),
    }

    privacy_script = r"""
import assert from 'node:assert/strict';
import { cardArtMarkup, enhanceCardArt } from './app/presentation/card-art.js';
const art = '/Assets/cards/cat-card/artworks/Rainbow-Ralphing-Cat.jpg';
const catalog = { visible: { art }, text: { art, uiBehavior: 'text' },
  icon: { art, uiBehavior: 'icon' }, replacement: { art: '/app/config/uploads/replacement.png' } };
const checks = [];
const verify = (name, fn) => { fn(); checks.push(name); };
verify('known visible face has decorative, inaccessible SVG', () => {
  const markup = cardArtMarkup({ type: 'visible' }, catalog);
  assert.match(markup, /class="steam-card-art/);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /focusable="false"/);
  assert.doesNotMatch(markup, /<image\b|<script\b|<foreignObject\b|\bhref\s*=/i);
});
for (const [flag, value] of [['faceDown', true], ['hidden', true], ['revealed', false]]) {
  verify(`${flag} suppresses known-face artwork`, () => {
    assert.equal(cardArtMarkup({ type: 'visible', [flag]: value }, catalog), '');
  });
}
verify('unknown, absent, text, icon and replaced faces stay untouched', () => {
  for (const type of ['unknown', 'text', 'icon', 'replacement'])
    assert.equal(cardArtMarkup({ type }, catalog), '');
  assert.equal(cardArtMarkup(null, catalog), '');
});
verify('unrecognized caller artwork cannot enter SVG markup', () => {
  assert.equal(cardArtMarkup({ art: `${art}\" onload=\"alert(1)` }), '');
});
verify('inspection and motion opt-outs disable existing overlays', () => {
  const overlay = { dataset: {} };
  const container = { querySelectorAll: () => [overlay], matches: () => false };
  assert.equal(enhanceCardArt(container, { motion: false, allowInspection: false }), 1);
  assert.deepEqual(overlay.dataset, { artMotion: 'off', artInspection: 'off' });
  assert.equal(enhanceCardArt(null), 0);
});
console.log(JSON.stringify({ checks, passed: true }));
"""
    report["card_art_privacy"] = run_node(["--input-type=module", "-"], privacy_script)
    if report["card_art_privacy"].get("passed"):
        try:
            report["card_art_privacy"]["assertions"] = json.loads(report["card_art_privacy"].pop("stdout"))
        except (ValueError, KeyError) as error:
            report["card_art_privacy"].update(passed=False, error=f"Unparseable assertion result: {error}")

    try:
        main = (ROOT / "app/main.js").read_text(encoding="utf-8-sig")
        match = re.search(r"\bconst\s+REACTION_MS\s*=\s*(\d+)\s*;", main)
        milliseconds = int(match.group(1)) if match else None
        report["reaction_constant"] = {
            "path": "app/main.js",
            "milliseconds": milliseconds,
            "expected": 3000,
            "passed": milliseconds == 3000,
            "limitation": "Static constant check only; browser checks must confirm start/reset behavior and motion independence.",
        }
    except OSError as error:
        report["errors"].append(f"Reaction constant check failed: {error}")

    required = ("original_assets", "protected_runtime", "presentation_syntax", "card_art_privacy", "reaction_constant")
    report["passed"] = not report["errors"] and all(report.get(key, {}).get("passed", False) for key in required)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Optional separate JSON integrity report; existing browser evidence is never read or overwritten implicitly.")
    arguments = parser.parse_args()
    report = verify()
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if arguments.output is not None:
        path = arguments.output if arguments.output.is_absolute() else ROOT / arguments.output
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rendered, encoding="utf-8")
    sys.stdout.write(rendered)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
