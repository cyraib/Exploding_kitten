"""Validate the research artifacts without changing or exercising the playable app."""
import ast
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

PROJECT = Path(__file__).resolve().parent.parent
RESEARCH = PROJECT / ".codex/research-animation"
REPORT = PROJECT / ".codex/research-animation-validation.json"

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []
        self.images = 0
        self.videos = 0
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "img":
            self.images += 1
        if tag == "video":
            self.videos += 1
        for name in ["href", "src"]:
            if data.get(name):
                self.targets.append(data[name])

def main():
    baseline = json.loads((PROJECT / ".codex/repository-audit-before.json").read_text(encoding="utf-8"))
    original_files = [item for item in baseline["files"] if item["path"].startswith("Assets/")]
    changed_assets = [item["path"] for item in original_files
                      if not (PROJECT / item["path"]).is_file() or digest(PROJECT / item["path"]) != item["sha256"]]
    source = json.loads((RESEARCH / "sources.json").read_text(encoding="utf-8"))
    archive = json.loads((RESEARCH / "press/archive-members.json").read_text(encoding="utf-8"))
    vendor = json.loads((RESEARCH / "vendor/vendor-sources.json").read_text(encoding="utf-8"))
    video = json.loads((RESEARCH / "video/source.json").read_text(encoding="utf-8"))
    gameplay = json.loads((RESEARCH / "gameplay/source.json").read_text(encoding="utf-8"))
    records = [item for item in source["records"] if "error" not in item] + archive
    records += [{**item, "path": item["file"]} for item in vendor["sources"]]
    records += [video] + gameplay.get("files", [])
    hash_errors = [record["path"] for record in records
                   if not (RESEARCH / record["path"]).is_file() or digest(RESEARCH / record["path"]) != record["sha256"]]
    catalogue = json.loads((RESEARCH / "scene-catalog.json").read_text(encoding="utf-8"))
    assert len(catalogue["recipes"]) == 17
    assert len(set(scene["id"] for scene in catalogue["scenes"])) == len(catalogue["scenes"])
    assert catalogue["target_build_id"] is None and catalogue["parity_established"] is False
    assert all(scene["steam_duration_ms"] is None and scene["response_deadline_ms"] is None for scene in catalogue["scenes"])
    markdown_files = [PROJECT / ".codex" / f"research-animation{suffix}.md" for suffix in ["-steam", "-gameplay", "-app-audit"]]
    markdown_files += [RESEARCH / "gameplay/observations.md"]
    links = []
    for file in markdown_files:
        value = file.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", value):
            target = target.strip().strip("<>")
            if not urlsplit(target).scheme:
                links.append((file.parent / unquote(target.split("#")[0])).resolve())
    document_link_errors = [str(path.relative_to(PROJECT)) for path in links if not path.exists()]
    viewer = Links()
    viewer.feed((RESEARCH / "index.html").read_text(encoding="utf-8"))
    viewer_link_errors = [target for target in viewer.targets if not urlsplit(target).scheme
                          and not (RESEARCH / unquote(target.split("#")[0])).exists()]
    syntax_checked = []
    for file in RESEARCH.glob("*.py"):
        ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
        syntax_checked.append(str(file.relative_to(PROJECT)))
    from PIL import Image
    decoded = []
    for item in catalogue["evidence"]:
        with Image.open(RESEARCH / item["path"]) as picture:
            picture.verify()
        decoded.append(item["path"])
    passed = not (changed_assets or hash_errors or document_link_errors or viewer_link_errors)
    report = {"date": "2026-10-06", "timezone": "Asia/Bangkok", "research_only": True,
              "passed": passed, "original_assets_checked": len(original_files), "changed_original_assets": changed_assets,
              "retained_source_files_hash_checked": len(records), "source_hash_errors": hash_errors,
              "source_download_errors": [item for item in source["records"] if "error" in item],
              "official_images_decoded": len(decoded), "recipes": len(catalogue["recipes"]),
              "scene_capture_entries": len(catalogue["scenes"]), "steam_exact_parity_claimed": False,
              "markdown_local_links_checked": len(links), "markdown_link_errors": document_link_errors,
              "viewer_images": viewer.images, "viewer_videos": viewer.videos, "viewer_link_errors": viewer_link_errors,
              "python_syntax_checked": syntax_checked,
              "visual_evidence": {"official_press_screenshots": "six visually inspected",
                                  "steam_trailer": "60 samples at 2 fps visually inspected",
                                  "vendor_montage": "36 samples at 4 fps visually inspected",
                                  "pc_gameplay": "15-second overview and selected 0.25-second samples; observations.md",
                                  "cosmetics": "selected retained screenshots visually inspected"},
              "runtime_checks": "Not run: no runtime code/config changed; artifact validation only",
              "viewer_browser_check": {"status": "pending"},
              "limitations": ["No current Steam build pinned", "No exact per-recipe inventories or motion/input/audio measurements",
                              "No application implementation performed", "Historical clips/press media do not prove universal Steam parity"]}
    # Preserve the separately recorded live viewer check when repeating validation.
    if REPORT.exists():
        previous = json.loads(REPORT.read_text(encoding="utf-8"))
        report["viewer_browser_check"] = previous.get("viewer_browser_check", report["viewer_browser_check"])
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
