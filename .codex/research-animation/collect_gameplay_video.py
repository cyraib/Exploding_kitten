"""Optional public gameplay capture collector. Platform/version must be verified separately."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tools"))
from yt_dlp import YoutubeDL
import imageio_ffmpeg

url = sys.argv[1]
folder = ROOT / "gameplay"
folder.mkdir(exist_ok=True)
options = {"format": "best[height<=480]/bestvideo[height<=480]+bestaudio/best",
           "outtmpl": str(folder / "%(id)s.%(ext)s"),
           "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
           "js_runtimes": {"node": {}}, "socket_timeout": 20,
           "retries": 1, "fragment_retries": 1,
           "noplaylist": True, "merge_output_format": "mp4"}
try:
    with YoutubeDL(options) as client:
        info = client.extract_info(url, download=True)
    files = [f for f in folder.glob(f"{info['id']}.*") if f.suffix in {".mp4", ".webm", ".mkv"}]
    record = {k: info.get(k) for k in ["id", "title", "channel", "upload_date", "duration", "fps", "width", "height"]}
    record["url"] = url
    record["status"] = "downloaded_not_yet_inspected"
    record["files"] = [{"path": str(f.relative_to(ROOT)).replace("\\", "/"),
                         "bytes": f.stat().st_size, "sha256": hashlib.sha256(f.read_bytes()).hexdigest()} for f in files]
except Exception as error:
    record = {"url": url, "status": "unavailable", "error": str(error)}
(folder / "source.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
print(json.dumps(record, indent=2))
