"""Check update1 documentation, screenshot files, and preserved source assets."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
baseline = json.loads((ROOT / ".codex/repository-audit-before.json").read_text(encoding="utf-8-sig"))
originals = [entry for entry in baseline["files"] if entry["path"].startswith("Assets/")]
mismatches = []
for entry in originals:
    path = ROOT / entry["path"]
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
        mismatches.append(entry["path"])

documents = ["memory.md", "README.md", ".codex/original-edition.md", ".codex/original-edition-update1.md", ".codex/memory.md"]
missing_links = []
checked_links = 0
for filename in documents:
    document = ROOT / filename
    for target in re.findall(r"\]\(([^)]+)\)", document.read_text(encoding="utf-8-sig")):
        if "://" in target or target.startswith("#"):
            continue
        checked_links += 1
        target = unquote(target.split("#", 1)[0])
        if not (document.parent / target).exists():
            missing_links.append({"document": filename, "target": target})

screenshots = {}
for path in sorted((ROOT / ".codex").glob("original-edition-update1-*.png")):
    with Image.open(path) as img:
        img.load()
        screenshots[path.name] = {"width": img.width, "height": img.height}

report = {
    "original_asset_files_checked": len(originals),
    "original_asset_mismatches": mismatches,
    "documentation_links_checked": checked_links,
    "missing_documentation_links": missing_links,
    "screenshots": screenshots,
}
target = ROOT / ".codex/original-edition-update1-validation.json"
validation = json.loads(target.read_text(encoding="utf-8"))
validation["integrity"] = report
target.write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
raise SystemExit(bool(mismatches or missing_links or len(screenshots) != 3))
