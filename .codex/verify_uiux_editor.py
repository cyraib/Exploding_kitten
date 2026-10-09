"""Validate editor mappings, configuration assets, links and original file integrity."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote
from PIL import Image

root = Path(__file__).resolve().parent.parent
baseline = json.loads((root / '.codex/repository-audit-before.json').read_text(encoding='utf-8-sig'))
originals = [f for f in baseline['files'] if f['path'].startswith('Assets/')]
changed = [f['path'] for f in originals if not (root / f['path']).is_file() or hashlib.sha256((root / f['path']).read_bytes()).hexdigest() != f['sha256']]
p = json.loads((root / 'app/config/project.json').read_text(encoding='utf-8'))
mapping_errors, asset_errors = [], []
for group in ['cards', 'decks', 'ui', 'animations', 'sounds', 'entities', 'features']:
    for item in p[group]:
        ref = item['source']
        file = root / ref['file']
        if not file.exists() or ref['symbol'] not in file.read_text(encoding='utf-8'):
            mapping_errors.append({'id': item['id'], 'reference': ref})
        for key in ['art', 'icon', 'asset']:
            value = item.get(key)
            if value and not (root / unquote(value.lstrip('/'))).is_file():
                asset_errors.append(value)
missing_links, links = [], 0
for name in ['memory.md','README.md','.codex/memory.md','.codex/uiux-editor.md']:
    doc = root / name
    for target in re.findall(r'\]\(([^)]+)\)',doc.read_text(encoding='utf-8-sig')):
        if '://' in target or target.startswith('#'): continue
        links += 1
        if not (doc.parent / unquote(target.split('#')[0])).exists(): missing_links.append({'document':name,'target':target})
screenshots = {}
for file in sorted((root / '.codex').glob('uiux-editor-*.png')):
    with Image.open(file) as image:
        image.load(); screenshots[file.name] = {'width':image.width,'height':image.height}
report = {'original_files_checked':len(originals),'changed_originals':changed,'source_mapping_errors':mapping_errors,'asset_errors':asset_errors,'documentation_links_checked':links,'missing_links':missing_links,'screenshots':screenshots,'catalog_counts':{k:len(p[k]) for k in ['cards','decks','ui','animations','sounds','entities','features']}}
validation_path = root / '.codex/uiux-editor-validation.json'
validation = json.loads(validation_path.read_text(encoding='utf-8')) if validation_path.exists() else {}
validation['integrity'] = report
validation_path.write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
raise SystemExit(bool(changed or mapping_errors or asset_errors or missing_links or len(screenshots)<2))
