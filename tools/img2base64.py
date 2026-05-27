#!/usr/bin/env python3
"""
Image to Base64 CLI Tool
========================

Convert image files to base64-encoded data URIs for agent consumption.

Usage:
    python tools/img2base64.py <image_path>
    python tools/img2base64.py wiki/leaves/assets/ch2/figure_43_2_1.png

Output: base64 data URI (e.g., data:image/png;base64,...) or raw base64 string.
"""

import sys
import base64
import mimetypes
from pathlib import Path


def img_to_base64(img_path: str, data_uri: bool = True) -> str:
    path = Path(img_path)
    if not path.exists():
        return f"[ERROR] File not found: {img_path}"

    mime, _ = mimetypes.guess_type(str(path))
    if not mime:
        mime = "application/octet-stream"

    data = path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")

    if data_uri:
        return f"data:{mime};base64,{b64}"
    return b64


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python img2base64.py <image_path>")
        print("       python img2base64.py --raw <image_path>  (output raw base64 only)")
        sys.exit(1)

    raw_mode = sys.argv[1] == "--raw"
    img_path = sys.argv[2] if raw_mode else sys.argv[1]

    result = img_to_base64(img_path, data_uri=not raw_mode)
    print(result)
