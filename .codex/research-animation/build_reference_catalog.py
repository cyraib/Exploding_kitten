"""Build an offline media index and a deliberately incomplete measurement catalogue."""
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STEAM = "https://store.steampowered.com/app/2999030/Exploding_Kittens_2/"
DECK_SOURCE = "https://steamcommunity.com/app/2999030/discussions/0/839501827476196256/?l=schinese"
PACKS = {"2999030": "Base", "3140300": "Kitchen Chaos", "3140310": "Beach Day",
         "3140320": "Expansions", "3276090": "Mystic Mayhem", "3377260": "Santa Claws", "4911740": "Soundtrack"}
DECKS = [("base", "Exploding Kittens", 2, 5), ("imploding", "Imploding Kittens", 2, 5),
         ("imploding", "Lightning Kittens", 2, 4), ("streaking", "Streaking Kittens", 2, 5),
         ("streaking", "Danger Mode", 2, 4), ("streaking", "Attack of the Attacks", 2, 5),
         *[("barking", name, low, high) for name, low, high in [
             ("Barking Kittens", 2, 5), ("Black Hole", 2, 5), ("Power Play", 2, 5),
             ("Sharing Is Caring", 2, 5), ("Nope Sauce", 2, 5), ("Meowsochist", 2, 5),
             ("Sticky Fingers", 2, 5), ("Eye for an Eye", 3, 5), ("Card Hoarders", 2, 4),
             ("Mind Games", 2, 5), ("Cat Fight", 2, 4)]]]
SCENES = {
    "screens": ["main-menu", "mode-select", "recipe-select", "theme-select", "wardrobe", "emote-select",
                "tutorial", "settings-pause", "lobby-create-join", "matchmaking", "reconnect", "rematch-rewards"],
    "base": ["deal", "turn-local", "turn-opponent", "hand-hover", "card-inspect", "card-select-cancel",
             "card-play", "invalid-input", "draw-local", "draw-opponent-private", "skip", "attack",
             "shuffle", "favor-target", "favor-gift", "see-future", "pair-theft", "triple-success",
             "triple-failure", "nope", "counter-nope", "reaction-expiry", "kitten-draw", "defuse",
             "secret-reinsert", "elimination", "spectator", "victory"],
    "imploding": ["first-imploding-draw", "face-up-reinsert", "imploding-top-warning", "fatal-imploding-draw",
                  "reverse", "bottom-draw", "targeted-attack", "alter-future-3", "feral-combo"],
    "streaking": ["protected-kitten", "streaking-lost", "kitten-transfer", "super-skip", "mark",
                  "garbage", "catomic", "swap-endpoints", "see-future-5", "alter-future-5"],
    "barking": ["barking-unmatched", "barking-matched", "barking-both-held", "bury", "ill-take-that",
                "tower-reserve-theft", "tower-empty", "alter-future-now", "personal-attack", "potluck", "share-future"],
    "cosmetic": ["environment-loop", "avatar-idle", "avatar-gaze", "avatar-hand", "avatar-death",
                 "emote-open", "emote-play", "cardback", "music-transition", "sound-cue"],
    "artwork": ["rainbow-ralphing-inspect", "pomeranian-shuffle-inspect", "lincoln-shuffle-inspect"]}

def build_catalog():
    source = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))
    entries = []
    for record in source["records"]:
        if "error" in record or record["kind"] not in {"official_screenshot", "official_dlc_screenshot"}:
            continue
        app_id = record["source_page"].split("/app/")[1].split("/")[0]
        entries.append({**record, "category": PACKS[app_id], "title": f"{PACKS[app_id]} / {Path(record['path']).name[:20]}"})
    press = json.loads((ROOT / "press/archive-members.json").read_text(encoding="utf-8"))
    for member in press:
        if Path(member["path"]).suffix.lower() != ".png":
            continue
        entries.append({**member, "category": "Press kit", "title": Path(member["path"]).name,
                        "url": "https://www.marmaladegamestudio.com/exploding-kittens-2-press-kit",
                        "source_page": "https://www.marmaladegamestudio.com/exploding-kittens-2-press-kit"})
    videos = [{"id": "steam-trailer", "title": "Official Steam trailer", "path": "video/official-steam-trailer.mp4",
               "url": STEAM, "limit": "Edited trailer; frame samples do not establish gameplay timing."},
              {"id": "vendor", "title": "Production-vendor card montage", "path": "vendor/ExplodingKittensAnim_1.mp4",
               "url": "https://thelostpixels.com/art/", "limit": "Edited inspections, no audio; platform/build unknown."},
              {"id": "pc-gameplay", "title": "Stumpt PC gameplay (2024-10-19)", "path": "gameplay/gNPBdjKDHco.mp4",
               "url": "https://www.youtube.com/watch?v=gNPBdjKDHco", "limit": "640x360 historical recording; selected frames inspected, not current-build parity."}]
    catalogue = {"date": "2026-10-06", "timezone": "Asia/Bangkok", "target_app_id": 2999030,
                 "target_build_id": None, "research_only": True, "parity_established": False,
                 "evidence": entries, "videos": videos,
                 "recipes": [{"group": group, "name": name, "players_min": low, "players_max": high,
                              "source": DECK_SOURCE, "inventory_by_player_count": None}
                             for group, name, low, high in DECKS],
                 "measurement_policy": "Unknown values stay null. Contact-sheet spans are not motion durations.",
                 "scenes": [{"id": f"{group}.{name}", "group": group, "label": name.replace("-", " "),
                             "status": "capture_needed", "complete_reference_clip": None,
                             "steam_duration_ms": None, "steam_easing": None, "steam_path": None,
                             "impact_pts": None, "input_enable_pts": None, "response_deadline_ms": None,
                             "audio_asset": None, "accepted_rules_contract": None,
                             "required_variants": ["actor", "recipient", "recipe", "player_count", "illustration", "theme", "outfit"]}
                            for group, names in SCENES.items() for name in names]}
    for scene in catalogue["scenes"]:
        if scene["id"] in {"base.nope", "base.elimination", "base.pair-theft", "imploding.first-imploding-draw", "imploding.alter-future-3"}:
            scene["partial_evidence"] = ["gameplay/observations.md"]
        elif scene["group"] == "artwork":
            scene["partial_evidence"] = ["vendor/contact-01.jpg", "vendor/ExplodingKittensAnim_1.mp4"]
        elif scene["id"] in {"base.turn-local", "base.draw-local", "base.defuse", "base.kitten-draw", "cosmetic.avatar-death"}:
            scene["partial_evidence"] = ["press/archive-members.json", "video/contact-sheet.jpg"]
    (ROOT / "scene-catalog.json").write_text(json.dumps(catalogue, indent=2), encoding="utf-8")
    return catalogue

def build_viewer(data):
    cards = "\n".join(f'<article data-category="{html.escape(item["category"],quote=True)}"><a href="{html.escape(item["path"],quote=True)}" target="_blank"><img loading="lazy" src="{html.escape(item["path"],quote=True)}" alt="{html.escape(item["title"],quote=True)}"></a><h3>{html.escape(item["title"])}</h3><p>{html.escape(item["category"])} · <a href="{html.escape(item["source_page"],quote=True)}" target="_blank" rel="noreferrer">Official source</a></p></article>' for item in data["evidence"])
    options = '<option value="all">All references</option>' + ''.join(f'<option>{html.escape(name)}</option>' for name in ["Base", "Expansions", "Kitchen Chaos", "Beach Day", "Mystic Mayhem", "Santa Claws", "Soundtrack", "Press kit"])
    videos = '\n'.join(f'<section class="video"><h3>{html.escape(v["title"])}</h3><video controls preload="metadata" src="{html.escape(v["path"],quote=True)}"></video><p>{html.escape(v["limit"])} <a href="{html.escape(v["url"],quote=True)}" target="_blank" rel="noreferrer">Source</a></p></section>' for v in data['videos'])
    template = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exploding Kittens 2 reference library</title>
<style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#171719;color:#eee}body{margin:0}header,main{max-width:1450px;margin:auto;padding:24px}header{border-bottom:1px solid #555}h1{margin:0 0 12px;color:#ffd166}p{line-height:1.6;color:#ccc}a{color:#8ecaff}h2{margin-top:35px}select,button{background:#303037;border:1px solid #777;color:#fff;padding:10px;border-radius:6px;font:inherit}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.grid img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#101012;border-radius:8px}article{border:1px solid #45454e;padding:10px;border-radius:8px}h3{font-size:15px;overflow-wrap:anywhere}article p{font-size:13px;margin-bottom:2px}.video{margin:24px 0;padding:18px;border:1px solid #45454e;border-radius:10px}video{width:100%;max-height:620px;background:black}.warn{border-left:3px solid #ffd166;padding-left:12px}.count{margin-left:12px}.jump{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}footer{margin:30px 0;color:#bbb}article[hidden]{display:none}</style>
<header><h1>Exploding Kittens 2 — visual references</h1><p>Research/specification · 6 October 2026 · Base game, three expansions, four cosmetic packs</p><p class="warn">Exact parity is unverified. Still images show appearance; montage timestamps are not gameplay durations. Videos and downloaded images remain separate from the playable project.</p><nav><a href="../research-animation-steam.md">Implementation specification</a> · <a href="../research-animation-gameplay.md">Gameplay research</a> · <a href="../research-animation-app-audit.md">Local audit</a> · <a href="scene-catalog.json">Scene catalogue</a> · <a href="sources.json">Source hashes</a></nav></header>
<main><h2>Animation and interaction references</h2><label>Playback speed <select id="speed"><option value="1">1×</option><option value="0.5">0.5×</option><option value="0.25">0.25×</option></select></label>
''' + videos + '''
<div class="jump"><button data-seek="228">PC: Nope ~3:48</button><button data-seek="238">PC: Imploding ~3:58</button><button data-seek="418">PC: elimination ~6:58</button><button data-seek="992">PC: Alter Future ~16:32</button><button data-seek="1353">PC: pair theft ~22:33</button><a href="gameplay/observations.md">Sample notes</a></div>
<h2>Official screenshots and press artwork</h2><label>Reference group <select id="filter">''' + options + '''</select></label><span class="count" id="count"></span><p>Click an image to inspect its preserved original. Some frames are promotional/menu art. Hashes and complete URLs are in the source manifests.</p><div class="grid">''' + cards + '''</div><footer>All implementation measurements are pending in the catalogue. No online content is required to view local media. Source links require Internet access.</footer></main>
<script>const items=[...document.querySelectorAll('article[data-category]')];const filter=document.querySelector('#filter');const count=document.querySelector('#count');function apply(){let n=0;for(const a of items){a.hidden=filter.value!=='all'&&a.dataset.category!==filter.value;if(!a.hidden)n++}count.textContent=n+' references'}filter.addEventListener('change',apply);apply();document.querySelector('#speed').addEventListener('change',e=>{for(const v of document.querySelectorAll('video'))v.playbackRate=Number(e.target.value)});for(const b of document.querySelectorAll('[data-seek]'))b.addEventListener('click',()=>{const v=document.querySelectorAll('video')[2];v.pause();v.currentTime=Number(b.dataset.seek);v.scrollIntoView({block:'center',behavior:'smooth'})});</script></html>'''
    (ROOT / "index.html").write_text(template, encoding="utf-8")

data = build_catalog()
build_viewer(data)
print(f"Built viewer: {len(data['evidence'])} images, {len(data['videos'])} videos, {len(data['recipes'])} recipes, {len(data['scenes'])} capture scenes")
