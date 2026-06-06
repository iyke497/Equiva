#!/usr/bin/env python3
"""One-time script: upload local images to ImgBB and print URL mappings.

Usage:
    python scripts/upload_to_imgbb.py

Requires IMGBB_API_KEY in .env or environment.
Prints key: URL pairs for updating _seed_defaults() in app/__init__.py.
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ.get('IMGBB_API_KEY')
if not API_KEY:
    print('Error: IMGBB_API_KEY not set in .env or environment')
    sys.exit(1)

BASE = Path('static/images')

IMAGE_MAP = {
    'equiva-light.svg':          'images.logo_light',
    'equiva-dark.svg':           'images.logo_dark',
    'favicon-light.ico':         'images.favicon_light',
    'favicon-dark.ico':          'images.favicon_dark',
    'landing/img-3-baby.jpg':     'images.hero_home',
    'landing/img-4-impact.jpg':  'images.home_visual',
    'about/img-3.jpg':           'images.hero_about',
    'about/img-4-white-paper.jpg':'images.about_visual',
    'about/mission-card-1.jpg':  'images.about_mission_1',
    'about/mission-card-2.webp': 'images.about_mission_2',
    'about/vision-card-1.jpg':   'images.about_vision_1',
    'about/vision-card-2.jpg':   'images.about_vision_2',
    'about/img-2-our-values.png':'images.about_values',
    'workwedo/img-1-market-women.jpg': 'images.hero_what_we_do',
    'workwedo/img-2-delivery.jpg':     'images.what_we_do_visual',
    'partners/img-1-hands.jpg':        'images.hero_partner',
    'partners/img-2-achieve.jpg':      'images.partner_visual',
    'join/img-1-happy-kids.jpg':       'images.hero_join',
}

results = {}

for file_path, db_key in IMAGE_MAP.items():
    full_path = BASE / file_path
    if not full_path.exists():
        print(f'SKIP  {db_key} — file not found: {full_path}')
        continue

    print(f'UPLOAD {file_path} -> {db_key} ...', end=' ', flush=True)
    try:
        with open(full_path, 'rb') as f:
            resp = requests.post(
                'https://api.imgbb.com/1/upload',
                data={'key': API_KEY},
                files={'image': (full_path.name, f)},
                timeout=60
            )
        data = resp.json()
        if data.get('success'):
            url = data['data']['url']
            results[db_key] = url
            print(url)
        else:
            print(f'FAIL — {data}')
    except Exception as e:
        print(f'ERROR — {e}')

print('\n=== RESULTS — paste into _seed_defaults() in app/__init__.py ===\n')
for key in sorted(results.keys()):
    print(f"    '{key}': '{results[key]}',")
print(f'\n{len(results)}/{len(IMAGE_MAP)} images uploaded successfully.')
