"""Builds upload payloads for the given article sources.

Usage: python3 tools/articles/build.py <name> [<name> ...]
<name> is a file in tools/articles/articles/ without `.py`.
"""

import html as html_lib
import importlib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / 'build'
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {b'\xff\xd8\xff': 'image/jpeg', b'\x89PNG': 'image/png', b'RIFF': 'image/webp'}
USER_AGENT = 'EpochBot/1.0 (https://www.epoch.ge)'

sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'articles'))


def validate(name, article):
    errors = []
    if not 3 <= len(article['title']) <= 200:
        errors.append('title must be 3–200 chars')
    if not article['content'] or len(article['content']) > 1_000_000:
        errors.append('content must be 1–1,000,000 chars')
    if len(article['tags']) > 10 or any(not 1 <= len(t) <= 30 for t in article['tags']):
        errors.append('max 10 tags, each 1–30 chars')
    if len(article['alt']) > 200:
        errors.append('alt must be at most 200 chars')
    for key in ('category', 'image'):
        if not article.get(key):
            errors.append(f'{key} is required')
    if errors:
        sys.exit(f'{name}: ' + '; '.join(errors))


def download_image(name, url):
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request) as response:
        data = response.read()
    mime = next((m for sig, m in IMAGE_TYPES.items() if data.startswith(sig)), None)
    if mime is None:
        sys.exit(f'{name}: image must be JPEG, PNG or WebP')
    if len(data) > MAX_IMAGE_BYTES:
        sys.exit(f'{name}: image is {len(data)} bytes, the API limit is 5 MB')
    filename = f'{name}.{mime.split("/")[1].replace("jpeg", "jpg")}'
    (BUILD / 'images' / filename).write_bytes(data)
    return filename, mime


def to_plain_text(article):
    text = re.sub(r'</(p|h1|h2|h3|li)>', '\n', article['content'])
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n+', '\n', text)
    return article['title'] + '\n' + html_lib.unescape(text)


def main(names):
    if not names:
        sys.exit(__doc__)
    (BUILD / 'images').mkdir(parents=True, exist_ok=True)
    (BUILD / 'proofs').mkdir(exist_ok=True)
    payloads = []
    for name in names:
        article = importlib.import_module(name).ARTICLE
        validate(name, article)
        filename, mime = download_image(name, article['image'])
        (BUILD / 'proofs' / f'{name}.txt').write_text(to_plain_text(article))
        payloads.append({**article, 'name': name, 'imageFile': filename, 'imageType': mime})
        print(f'{name}: {len(article["content"])} chars, image {filename}')
    (BUILD / 'payloads.json').write_text(json.dumps(payloads, ensure_ascii=False))
    print(f'Proofread build/proofs/*.txt, then run serve.py and upload.js.')


if __name__ == '__main__':
    main(sys.argv[1:])
