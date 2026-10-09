"""Read-only repository audit; writes only the explicitly selected JSON report.

Run from the project root:
    python .codex/audit_repository.py --report .codex/repository-audit.json
Requires Pillow, pypdf, and PyMuPDF for binary inspection. Does not fetch URLs
or rewrite assets. Report files named repository-audit*.json are excluded from
their own inventory to keep repeated runs stable.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

from PIL import Image
from pypdf import PdfReader
import fitz


ROOT = Path(__file__).resolve().parents[1]
TEXT_TYPES = {'.md', '.json', '.csv', '.txt', '.py', '.js', '.mjs', '.html', '.css', '.ps1'}
IMAGE_TYPES = {'.png', '.jpg', '.jpeg', '.webp'}


def audit() -> dict:
    files, errors, links, missing, sources, pdfs, images = [], [], [], [], {}, [], []
    texts, json_data, csv_data = {}, {}, {}
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or '.git' in path.parts or '__pycache__' in path.parts:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith('.codex/repository-audit') and path.suffix == '.json':
            continue
        raw = path.read_bytes()
        files.append({'path': relative, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
        try:
            if path.suffix.lower() in TEXT_TYPES:
                content = raw.decode('utf-8-sig')
                texts[relative] = content
                for url in re.findall(r'https?://[^\s<>\"\)\]]+', content):
                    sources.setdefault(url.rstrip('.,;'), set()).add(relative)
                if path.suffix == '.json':
                    json_data[relative] = json.loads(content)
                if path.suffix == '.csv':
                    csv_data[relative] = list(csv.DictReader(io.StringIO(content)))
                if path.suffix == '.md':
                    for target in re.findall(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', content):
                        target = target.strip().strip('<>')
                        if urlsplit(target).scheme or target.startswith('#'):
                            continue
                        resolved = path.parent / unquote(target.split('#', 1)[0])
                        item = {'file': relative, 'target': target}
                        links.append(item)
                        if not resolved.exists():
                            item['resolved'] = resolved.resolve().relative_to(ROOT).as_posix()
                            missing.append(item)
            elif path.suffix.lower() in IMAGE_TYPES:
                with Image.open(path) as im:
                    im.load()
                    images.append({'path': relative, 'width': im.width, 'height': im.height, 'mode': im.mode})
            elif path.suffix.lower() == '.pdf':
                reader = PdfReader(path)
                page_count = len(reader.pages)
                with fitz.open(path) as document:
                    page_text = [page.get_text() for page in document]
                pdfs.append({'path': relative, 'pages': page_count,
                             'text_characters_per_page': [len(s.strip()) for s in page_text],
                             'needs_visual_review_pages': [i + 1 for i, s in enumerate(page_text) if len(s.strip()) < 100],
                             'text_preview': '\n'.join(page_text)[:1000]})
        except Exception as exc:
            errors.append({'file': relative, 'error': f'{type(exc).__name__}: {exc}'})

    decks = []
    for relative, data in sorted(json_data.items()):
        if not relative.endswith('/deck.json'):
            continue
        folder = Path(relative).parent
        cards = data['cards']
        checks = []
        def check(condition, description):
            if not condition:
                checks.append(description)
        check(data['id'] == folder.name, 'deck id differs from folder name')
        check(sum(c['count'] for c in cards) == data['total_cards'], 'physical card total mismatch')
        check(sum(c['count'] for c in cards if c['zone'] == 'deck') == data['draw_deck_inventory_cards'], 'draw-deck inventory mismatch')
        check(len({c['family'] for c in cards}) == data['card_families'], 'family count mismatch')
        check(len(cards) == data['distinct_named_card_types'], 'named type count mismatch')
        check(len({c['id'] for c in cards}) == len(cards), 'duplicate card ids')
        rows = csv_data.get((folder / 'cards.csv').as_posix(), [])
        check(len(rows) == len(cards), 'CSV row count mismatch')
        for card, row in zip(cards, rows):
            check(card['with_paw'] + card['without_paw'] == card['count'], f"paw split mismatch: {card['id']}")
            for key, value in row.items():
                check(str(card.get(key)) == value, f"CSV differs for {card['id']}.{key}")
            for target in [card['icon'], card['asset_folder'], *card['artwork_files']]:
                check((ROOT / target).exists(), f'missing asset: {target}')
        for name in ['README.md', 'instructions.md', 'asset-map.md', 'cards.csv', 'deck.json', 'rules.pdf', 'photo.webp', 'logo.webp']:
            check((ROOT / folder / name).is_file(), f'missing deck file: {name}')
        summary = {key: value for key, value in data.items() if key != 'cards'}
        summary.update({'folder': folder.as_posix(), 'checks_passed': not checks, 'errors': checks,
                        'with_paw_total': sum(c['with_paw'] for c in cards),
                        'without_paw_total': sum(c['without_paw'] for c in cards)})
        decks.append(summary)

    recipe_path = 'Assets/decks/exploding-kittens-recipes-for-disaster/recipes/recipes.json'
    recipes, recipe_errors, ingredient_conflicts = [], [], []
    box = json_data.get('Assets/decks/exploding-kittens-recipes-for-disaster/deck.json', {})
    box_counts = {c['id']: c['count'] for c in box.get('cards', [])}
    for recipe in json_data.get(recipe_path, []):
        for variant in recipe['variants']:
            if sum(c['count'] for c in variant['cards']) != variant['total_cards']:
                recipe_errors.append(f"{recipe['id']}, {variant['players']} players: ingredient total mismatch")
            for card in variant['cards']:
                if card['count'] > box_counts.get(card['id'], 0):
                    ingredient_conflicts.append({'recipe': recipe['id'], 'players': variant['players'],
                                                 'card': card['id'], 'requested': card['count'],
                                                 'available': box_counts.get(card['id'], 0)})
        recipes.append({key: value for key, value in recipe.items() if key != 'variants'} | {
            'variants_count': len(recipe['variants']),
            'player_counts': [v['players'] for v in recipe['variants']],
        })
    reference_gaps = sorted({item['resolved'] for item in missing})
    return {
        'checked_at': datetime.now(timezone(timedelta(hours=7), 'Asia/Bangkok')).isoformat(),
        'root': str(ROOT),
        'scope': 'Full file inventory and hashes, all UTF-8 text files parsed/read, local Markdown targets, JSON/CSV inventory consistency, image decode, PDF parse and text inspection. No online source or full visual/rule revalidation.',
        'file_count': len(files), 'bytes': sum(f['bytes'] for f in files),
        'extension_counts': dict(sorted(Counter(Path(f['path']).suffix for f in files).items())),
        'text_files_read': len(texts), 'json_files_parsed': len(json_data), 'csv_files_parsed': len(csv_data),
        'git_repository_present': (ROOT / '.git').exists(),
        'images_decoded': len(images), 'pdfs_opened': len(pdfs),
        'local_markdown_links_checked': len(links), 'broken_local_markdown_links': missing,
        'missing_referenced_paths': reference_gaps, 'file_errors': errors,
        'deck_count': len(decks), 'deck_checks_passed': all(d['checks_passed'] for d in decks),
        'decks': decks, 'recipe_count': len(recipes), 'recipes': recipes,
        'recipe_variant_count': sum(r['variants_count'] for r in recipes),
        'recipe_structure_errors': recipe_errors, 'recipe_ingredient_conflicts': ingredient_conflicts,
        'source_urls_in_local_text': {url: sorted(paths) for url, paths in sorted(sources.items())},
        'images': images, 'pdfs': pdfs, 'files': files,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', required=True, help='Destination JSON, relative to the project root or absolute')
    parser.add_argument('--baseline', help='Previous report whose existing file hashes should be compared')
    args = parser.parse_args()
    report = audit()
    if args.baseline:
        baseline = json.loads((ROOT / args.baseline).read_text(encoding='utf-8-sig'))
        current = {f['path']: f for f in report['files']}
        original_assets = [f for f in baseline['files'] if f['path'].startswith('Assets/')]
        changed = [f['path'] for f in original_assets if f['path'] not in current or current[f['path']]['sha256'] != f['sha256']]
        report['baseline_comparison'] = {'baseline': args.baseline, 'existing_asset_files_checked': len(original_assets), 'changed_or_missing_asset_files': changed}
    destination = ROOT / args.report
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key not in {'files', 'images', 'pdfs', 'decks', 'recipes', 'source_urls_in_local_text', 'broken_local_markdown_links'}}, indent=2))
    print('PDF inspection:', json.dumps([{k: v for k, v in pdf.items() if k != 'text_preview'} for pdf in report['pdfs']]))
    print('Report:', destination)
    raise SystemExit(1 if report['file_errors'] or report['recipe_structure_errors'] or not report['deck_checks_passed'] or report.get('baseline_comparison', {}).get('changed_or_missing_asset_files') else 0)


if __name__ == '__main__':
    main()
