"""Verify original bytes and the final playtest's links and screenshots."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import unquote
from PIL import Image

root = Path(__file__).resolve().parent.parent
baseline = json.loads((root / '.codex/repository-audit-before.json').read_text(encoding='utf-8-sig'))
originals = [e for e in baseline['files'] if e['path'].startswith('Assets/')]
changed = [e['path'] for e in originals if not (root / e['path']).is_file() or hashlib.sha256((root / e['path']).read_bytes()).hexdigest() != e['sha256']]
missing = []
links = 0
for name in ['memory.md', 'README.md', '.codex/original-edition.md', '.codex/original-edition-playtest.md', '.codex/memory.md']:
    doc = root / name
    for target in re.findall(r'\]\(([^)]+)\)', doc.read_text(encoding='utf-8-sig')):
        if '://' in target or target.startswith('#'):
            continue
        links += 1
        if not (doc.parent / unquote(target.split('#', 1)[0])).exists():
            missing.append({'document': name, 'target': target})
screenshots = {}
for path in sorted((root / '.codex').glob('original-edition-playtest-*.png')):
    with Image.open(path) as image:
        image.load()
        screenshots[path.name] = {'width': image.width, 'height': image.height}
report = {'original_files_checked': len(originals), 'changed_originals': changed, 'documentation_links_checked': links, 'missing_links': missing, 'screenshots': screenshots}
validation_file = root / '.codex/original-edition-playtest-validation.json'
validation = json.loads(validation_file.read_text(encoding='utf-8'))
validation['integrity'] = report
validation_file.write_text(json.dumps(validation, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
raise SystemExit(bool(changed or missing or len(screenshots) != 3))
