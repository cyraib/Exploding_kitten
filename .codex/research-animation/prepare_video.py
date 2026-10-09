"""Preserve the official Steam trailer and derive timestamped research frames."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tools"))
import imageio_ffmpeg

def main():
    app = json.loads((ROOT / "steam/app-2999030.json").read_text(encoding="utf-8"))["2999030"]["data"]
    movie = app["movies"][0]
    url = movie["hls_h264"]
    folder = ROOT / "video"
    folder.mkdir(exist_ok=True)
    destination = folder / "official-steam-trailer.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    if not destination.exists():
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-i", url,
                        "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", str(destination)], check=True)
    frames = folder / "frames"
    frames.mkdir(exist_ok=True)
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-i", str(destination),
                    "-vf", "fps=2,scale=960:-1", "-y", str(frames / "frame-%04d.jpg")], check=True)
    record = {"collected_at_utc": datetime.now(timezone.utc).isoformat(),
              "title": movie["name"], "movie_id": movie["id"], "url": url,
              "source_page": "https://store.steampowered.com/app/2999030/Exploding_Kittens_2/",
              "path": "video/official-steam-trailer.mp4", "bytes": destination.stat().st_size,
              "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
              "method": "HLS stream remux without video/audio re-encoding; this is not the studio master",
              "derived_frames": {"fps": 2, "width": 960, "path": "video/frames/frame-%04d.jpg",
                                 "timestamp_seconds": "(frame_number - 0.5) / 2; validate actual frame PTS for fine timing"}}
    (folder / "source.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(f"Saved trailer ({destination.stat().st_size} bytes) and {len(list(frames.glob('*.jpg')))} sample frames")

if __name__ == "__main__":
    main()
