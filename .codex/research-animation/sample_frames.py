"""Make labelled contact sheets for video inspection; originals remain unchanged."""
import argparse
import math
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tools"))
import imageio_ffmpeg

parser = argparse.ArgumentParser()
parser.add_argument("video")
parser.add_argument("folder")
parser.add_argument("--start", type=float, default=0)
parser.add_argument("--length", type=float)
parser.add_argument("--interval", type=float, default=15)
args = parser.parse_args()
folder = ROOT / args.folder
folder.mkdir(parents=True, exist_ok=True)
command = [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "warning",
           "-ss", str(args.start), "-i", str(ROOT / args.video)]
if args.length is not None:
    command += ["-t", str(args.length)]
command += ["-vf", f"fps=1/{args.interval},scale=640:-1", "-y", str(folder / "frame-%04d.jpg")]
subprocess.run(command, check=True)
files = sorted(folder.glob("frame-*.jpg"))
for batch_index in range(math.ceil(len(files) / 24)):
    batch = files[batch_index*24:(batch_index+1)*24]
    canvas = Image.new("RGB", (1280, math.ceil(len(batch)/4)*202), (25,25,25))
    draw = ImageDraw.Draw(canvas)
    for index, file in enumerate(batch):
        canvas.paste(Image.open(file).resize((320,180)), ((index%4)*320,(index//4)*202))
        # Display sampling interval centre, not exact motion boundary.
        seconds = args.start + (int(file.stem.split("-")[1])-.5)*args.interval
        draw.text(((index%4)*320+5,(index//4)*202+183), f"~{seconds:.2f}s {file.name}", fill="white")
    canvas.save(folder / f"contact-{batch_index+1:02d}.jpg")
print(f"Saved {len(files)} frames in {folder}")
