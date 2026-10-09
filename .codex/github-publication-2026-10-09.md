# GitHub publication - 2026-10-09

## Scope

Publish the complete current Exploding Kittens project as a new private GitHub repository for the authenticated `cyraib` account.

## Repository hygiene

- Added root `.gitignore` rules for local runtime logs/PIDs, generated editor recovery snapshots, Python caches, OS metadata, and downloaded research-tool copies.
- Preserved application code, requirements, documentation, original game assets, validation evidence, retained source images, and retained source media.
- Added Git LFS tracking for MP4 and ZIP files. This keeps the 101,839,551-byte retained gameplay video below GitHub's normal Git-object limit without deleting or recompressing it.
- Scanned file names and textual project content for common credential, private-key, access-token, and API-key patterns; no match was found.
- The ignored `.codex/research-animation/tools/` directory contains downloaded `yt-dlp`/FFmpeg tooling rather than project-authored game or research evidence. It remains available locally and can be recreated through the documented research collectors.

## Publication result

The final repository URL, commit, remote checks, and limitations are recorded in the root `memory.md` task entry after publication.

