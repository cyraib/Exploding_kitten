"""Collect official public EK2 reference media without touching game assets.

Run from the project root. URLs, hashes and original filenames are retained.
This is a research collector, not an asset import or game modification.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
ROOT.mkdir(parents=True, exist_ok=True)
RECORDS = []

def collect(url, relative, kind, source_page):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "EK2-reference-research/1.0"})
    try:
        if not path.exists():
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
            path.write_bytes(data)
        data = path.read_bytes()
        record = {"path": relative, "url": url, "source_page": source_page,
                  "kind": kind, "bytes": len(data),
                  "sha256": hashlib.sha256(data).hexdigest()}
        print(f"Saved {relative}: {len(data)} bytes", flush=True)
    except Exception as error:
        record = {"path": relative, "url": url, "source_page": source_page,
                  "kind": kind, "error": str(error)}
        print(f"Failed {relative}: {error}", flush=True)
    RECORDS.append(record)
    return record

def main():
    steam = "https://store.steampowered.com/app/2999030/Exploding_Kittens_2/"
    api = "https://store.steampowered.com/api/appdetails?appids=2999030&l=english"
    result = collect(api, "steam/app-2999030.json", "official_store_metadata", steam)
    if "error" not in result:
        app = json.loads((ROOT / result["path"]).read_text(encoding="utf-8"))["2999030"]["data"]
        jobs = []
        for entry in app.get("screenshots", []):
            filename = entry["path_full"].split("/")[-1].split("?")[0]
            jobs.append((entry["path_full"], f"steam/{filename}", "official_screenshot", steam))
        for app_id in app.get("dlc", []):
            jobs.append((f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=english",
                         f"steam/app-{app_id}.json", "official_store_metadata",
                         f"https://store.steampowered.com/app/{app_id}/"))
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda job: collect(*job), jobs))
        dlc_jobs = []
        for app_id in app.get("dlc", []):
            file = ROOT / f"steam/app-{app_id}.json"
            if not file.exists():
                continue
            item = json.loads(file.read_text(encoding="utf-8"))[str(app_id)].get("data", {})
            for entry in item.get("screenshots", []):
                filename = entry["path_full"].split("/")[-1].split("?")[0]
                dlc_jobs.append((entry["path_full"], f"steam/{app_id}/{filename}", "official_dlc_screenshot",
                                 f"https://store.steampowered.com/app/{app_id}/"))
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda job: collect(*job), dlc_jobs))
    page = "https://www.marmaladegamestudio.com/exploding-kittens-2-press-kit"
    archive = collect("https://s3.us-east-1.amazonaws.com/assets.marmaladegamestudio.com/Exploding_Kittens2_PR_KIT_4e50abde52.zip",
                      "press/Exploding_Kittens2_PR_KIT_4e50abde52.zip", "official_press_archive", page)
    if "error" not in archive:
        with zipfile.ZipFile(ROOT / archive["path"]) as bundle:
            entries = []
            for entry in bundle.infolist():
                target = (ROOT / "press/extracted" / entry.filename).resolve()
                allowed = (ROOT / "press/extracted").resolve()
                if not target.is_relative_to(allowed):
                    raise ValueError("Unsafe archive path")
                if entry.is_dir():
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                data = bundle.read(entry)
                if not target.exists():
                    target.write_bytes(data)
                entries.append({"path": str(target.relative_to(ROOT)).replace("\\", "/"),
                                "archive_member": entry.filename, "bytes": len(data),
                                "sha256": hashlib.sha256(data).hexdigest()})
            (ROOT / "press/archive-members.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")
            print(f"Preserved {len(entries)} archive members", flush=True)
    manifest = {"collected_at_utc": datetime.now(timezone.utc).isoformat(),
                "purpose": "Reference-only research; no runtime import", "records": RECORDS}
    (ROOT / "sources.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
