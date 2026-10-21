#!/usr/bin/env python3
"""Replay the recorded 7x7 crops, with optional installed Pillow. No OCR/network/install.
Run: python3 scripts/sample_screenshot.py
This validates only screenshot pixels, not movie authenticity or a display profile.
"""
from __future__ import annotations
from pathlib import Path
from collections import Counter
import json
import hashlib
import sys

def main() -> int:
    try:
        from PIL import Image
    except ImportError:
        print('Pillow is unavailable. Screenshot replay is BLOCKED; nothing was installed.', file=sys.stderr)
        return 2
    root = Path(__file__).resolve().parents[1]
    audit = json.loads((root / 'data/screenshot-audit.json').read_text(encoding='utf-8'))
    image_path = root / audit['image']
    errors: list[str] = []
    if hashlib.sha256(image_path.read_bytes()).hexdigest() != audit['sha256']:
        errors.append('Image hash differs from the sampled input.')
    count = 0
    with Image.open(image_path) as original:
        image = original.convert('RGB')
        if list(image.size) != audit['size']:
            errors.append('Image dimensions differ from the audit.')
        for row in audit['rows']:
            for sample in row['samples']:
                roi = sample['roi']
                if len(roi) != 4 or roi[0] < 0 or roi[1] < 0 or roi[2] > image.width or roi[3] > image.height:
                    errors.append(f"{row['id']}: crop outside image.")
                    continue
                # Use the current API where available; preserve compatibility without installing anything.
                crop = image.crop(tuple(roi))
                pixels = crop.get_flattened_data() if hasattr(crop, 'get_flattened_data') else crop.getdata()
                modal = Counter(pixels).most_common(1)[0][0]
                value = '#%02X%02X%02X' % modal
                count += 1
                if value != sample['sampleHex']:
                    errors.append(f"{row['id']}[{sample['index']}]: {value} != {sample['sampleHex']}")
    if count != audit['totals']['colorsCompared']:
        errors.append('Sample count differs from the expected total.')
    print(json.dumps({'scope':'screenshot-pixel-replay-only','passed':not errors,
                      'samplesChecked':count,'errors':errors,'filmFramesVerified':False},indent=2))
    return 1 if errors else 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'Screenshot replay failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
