#!/usr/bin/env python3
"""
PDF Cache Engine — Tool-driven PDF-to-Markdown extraction
==========================================================

Segment-oriented. Converts one or more contiguous PDF pages to Markdown,
with heading inference, table detection, and optional image extraction.

No agent involvement in cache content generation. Pure tool.
"""

import re
from pathlib import Path
from typing import Optional, List, Tuple


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER / FOOTER / LEGAL TEXT — Skip patterns
# ═══════════════════════════════════════════════════════════════════════════════

_SKIP_PATTERNS = [
    "Synopsys, Inc.", "SolvNet", "DesignWare.com",
    "Ethernet Quality-of-Service Databook",
    "Destination Control Statement", "Disclaimer",
    "Trademarks", "Third-Party Links", "www.synopsys.com",
    "December 2017", "5.10a", "Copyright Notice",
    "Continued on next page", "Version 5.10a",
    "Open-source-documentation-tutorial",
]


# ═══════════════════════════════════════════════════════════════════════════════
# PDF RESOLUTION
# ═══════════════════════════════════════════════════════════════════════════════

def resolve_pdf(pdf_name: str = None, raw_dir: Path = None) -> Path:
    """Resolve PDF path from raw/ directory."""
    raw_dir = raw_dir or Path(__file__).parent.parent / "raw"
    default_pdf = raw_dir / "DWC_ether_qos_databook.pdf"

    if pdf_name:
        p = raw_dir / pdf_name
        if p.exists():
            return p
        if not pdf_name.endswith(".pdf"):
            p = raw_dir / (pdf_name + ".pdf")
            if p.exists():
                return p
        raise FileNotFoundError(f"PDF not found in raw/: {pdf_name}")

    if default_pdf.exists():
        return default_pdf

    pdfs = list(raw_dir.glob("*.pdf"))
    if pdfs:
        return pdfs[0]

    raise FileNotFoundError(f"No PDF found in {raw_dir}")


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGE EXTRACTION (per page)
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_page_images(doc, page, page_num: int, images_dir: Path) -> List[Tuple[float, str]]:
    """
    Extract images from a single PDF page.

    Returns:
        List of (y_position, Markdown_image_reference_string) tuples.
    """
    import fitz

    refs: List[Tuple[float, str]] = []
    seen_xrefs = set()
    img_list = page.get_images(full=True)

    for img_index, img in enumerate(img_list):
        xref = img[0]
        if xref in seen_xrefs:
            continue
        seen_xrefs.add(xref)

        try:
            pix = fitz.Pixmap(doc, xref)
            # Convert unsupported colorspaces (CMYK, Separation, DeviceN) to RGB
            # before saving as PNG. pix.n > 4 catches other exotic formats.
            if pix.colorspace is not None and pix.colorspace.name not in ("DeviceGray", "DeviceRGB"):
                pix = fitz.Pixmap(fitz.csRGB, pix)
            elif pix.n > 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            if pix.width < 30 or pix.height < 30:
                pix = None
                continue

            img_name = f"img_{img_index:03d}.png"
            img_path = images_dir / img_name
            pix.save(str(img_path))
            pix = None

            rel = f"images/{images_dir.name}/{img_name}"
            refs.append((0.0, f"\n![Figure {img_index + 1}]({rel})\n"))
        except Exception as e:
            print(f"  [WARN] Failed to extract image xref={xref} on page {page_num}: {e}")
            continue

    return refs


def _extract_figure_screenshots(page, page_num: int, images_dir: Optional[Path]) -> dict:
    """
    Detect vector figures (block diagrams, timing diagrams) on a page and
    screenshot them. Figures are identified by 'Figure X-Y' captions.

    Returns:
        dict mapping normalized caption text -> (y_pos, markdown_ref, caption_bbox)
    """
    if images_dir is None:
        return {}

    import fitz

    blocks = page.get_text("dict")["blocks"]
    figures = []

    for block in blocks:
        if block["type"] != 0:
            continue
        text = "".join(
            span["text"] for line in block.get("lines", [])
            for span in line.get("spans", [])
        ).strip()
        if not text:
            continue

        # Match "Figure X-Y" or "Figure X" at start of block
        m = re.match(r"(Figure\s+(\d+)(?:[\.-](\d+))?[\s:\n]*)", text, re.IGNORECASE)
        if m:
            fig_num = f"{m.group(2)}-{m.group(3)}" if m.group(3) else m.group(2)
            bbox = fitz.Rect(block["bbox"])
            norm = re.sub(r'\s+', ' ', text.lower().strip())
            figures.append((bbox.y0, text, norm, bbox, fig_num))

    if not figures:
        return {}

    figures.sort(key=lambda x: x[0])
    drawings = page.get_drawings()
    results = {}
    chapter_id = images_dir.name

    for i, (cy, caption, norm, cbbox, fig_num) in enumerate(figures):
        # Vertical range: look up to 400pt above caption, down to next figure
        y_start = max(0, cy - 400)
        y_end = figures[i + 1][0] - 10 if i + 1 < len(figures) else page.rect.y1 - 15

        fig_rects = []
        for d in drawings:
            d_rect = d["rect"]
            center_y = (d_rect.y0 + d_rect.y1) / 2
            if y_start <= center_y <= y_end:
                # Filter out page-wide decorative lines
                if d_rect.width < page.rect.width * 0.92:
                    fig_rects.append(d_rect)
                elif d_rect.height > 8:
                    fig_rects.append(d_rect)

        fig_rects.append(cbbox)

        if not fig_rects:
            continue

        union = fig_rects[0]
        for r in fig_rects[1:]:
            union |= r

        margin = 12
        clip = fitz.Rect(
            max(0, union.x0 - margin),
            max(0, union.y0 - margin),
            min(page.rect.x1, union.x1 + margin),
            min(page.rect.y1, union.y1 + margin)
        )

        if clip.width < 60 or clip.height < 30:
            continue

        img_name = f"figure_{page_num}_{fig_num.replace('-', '_')}.png"
        img_path = images_dir / img_name

        try:
            pix = page.get_pixmap(clip=clip, dpi=150)
            pix.save(str(img_path))
            rel = f"images/{chapter_id}/{img_name}"
            md_ref = f"\n![{caption}]({rel})\n"
            results[norm] = (cy, md_ref, cbbox)
            print(f"  [FIGURE] {img_name} ({int(clip.width)}x{int(clip.height)})")
        except Exception as e:
            print(f"  [WARN] Figure screenshot failed {fig_num} p.{page_num}: {e}")

    return results


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE DETECTION → MARKDOWN
# ═══════════════════════════════════════════════════════════════════════════════

def _cells_to_markdown(cells: List[List[str]]) -> str:
    """Convert a 2-D cell array to a Markdown table."""
    if not cells or not cells[0]:
        return ""

    def _clean(cell):
        if cell is None:
            return ""
        text = str(cell).replace("\n", " ").strip()
        # Collapse multiple spaces
        while "  " in text:
            text = text.replace("  ", " ")
        # Escape pipe characters
        text = text.replace("|", "\\|")
        return text

    lines = []
    header = "| " + " | ".join(_clean(c) for c in cells[0]) + " |"
    lines.append(header)
    sep = "| " + " | ".join("---" for _ in cells[0]) + " |"
    lines.append(sep)
    for row in cells[1:]:
        lines.append("| " + " | ".join(_clean(c) for c in row) + " |")

    return "\n".join(lines)


def _extract_tables(page) -> List[Tuple[tuple, str]]:
    """
    Detect tables on a page and convert to Markdown.

    Returns:
        List of (bbox, markdown_table) tuples.
    """
    result = []
    try:
        tables = page.find_tables()
        for table in tables:
            cells = table.extract()
            if cells and len(cells) >= 1:
                md = _cells_to_markdown(cells)
                if md:
                    result.append((table.bbox, md))
    except Exception:
        pass
    return result


def _bbox_overlap_ratio(bbox_a: tuple, bbox_b: tuple) -> float:
    """Return overlap area ratio of bbox_a inside bbox_b."""
    x1 = max(bbox_a[0], bbox_b[0])
    y1 = max(bbox_a[1], bbox_b[1])
    x2 = min(bbox_a[2], bbox_b[2])
    y2 = min(bbox_a[3], bbox_b[3])

    if x2 <= x1 or y2 <= y1:
        return 0.0

    overlap = (x2 - x1) * (y2 - y1)
    area_a = (bbox_a[2] - bbox_a[0]) * (bbox_a[3] - bbox_a[1])
    if area_a == 0:
        return 0.0
    return overlap / area_a


# ═══════════════════════════════════════════════════════════════════════════════
# TEXT → MARKDOWN (per block)
# ═══════════════════════════════════════════════════════════════════════════════

def _render_text_block(block: dict, page_num: int) -> List[str]:
    """Convert a single text block to Markdown lines."""
    md_lines: List[str] = []

    for line in block["lines"]:
        line_text = "".join(span["text"] for span in line["spans"])
        line_text = line_text.strip()
        if not line_text:
            continue
        if any(line_text.startswith(p) for p in _SKIP_PATTERNS):
            continue
        if len(line_text) <= 3:
            continue

        max_size = max(
            (span["size"] for span in line["spans"]), default=10
        )
        is_bold = any(
            "Bold" in span.get("font", "")
            for span in line["spans"]
        )

        # Skip header/footer text (small text near page edges)
        line_y = line["spans"][0]["bbox"][1] if line["spans"] else 0
        if (line_y < 55 or line_y > 720) and max_size < 14:
            continue

        if max_size >= 20:
            md_lines.append(f"\n# {line_text}\n")
        elif max_size >= 14:
            md_lines.append(f"\n## {line_text}\n")
        elif max_size >= 11 and is_bold:
            md_lines.append(f"\n### {line_text}\n")
        else:
            md_lines.append(line_text)

    return md_lines


def _render_page(page, page_num: int, doc, images_dir: Optional[Path]) -> List[str]:
    """
    Render a single PDF page to Markdown.

    Extracts tables, text blocks, and images, then orders them by y-coordinate
    to preserve the original reading flow.
    """
    elements: List[Tuple[float, str, any]] = []

    # 1. Detect tables
    tables = _extract_tables(page)
    table_bboxes = [t[0] for t in tables]

    # Extract figure screenshots (vector diagrams)
    figure_screenshots = _extract_figure_screenshots(page, page_num, images_dir)

    # 2. Collect text blocks (skip those inside tables, skip figure captions)
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        if block["type"] != 0:
            continue
        block_bbox = block["bbox"]
        inside_table = any(_bbox_overlap_ratio(block_bbox, tb) > 0.7 for tb in table_bboxes)
        if inside_table:
            continue

        # Check if this block is a figure caption with a screenshot
        block_text = "".join(
            span["text"] for line in block.get("lines", [])
            for span in line.get("spans", [])
        ).strip()
        is_caption = False
        if len(block_text) < 300 and re.search(r"^Figure\s+\d+(?:[\.-]\d+)?", block_text, re.IGNORECASE):
            norm = re.sub(r'\s+', ' ', block_text.lower().strip())
            for caption_norm, (y_pos, md_ref, cbbox) in figure_screenshots.items():
                if norm == caption_norm or caption_norm in norm or norm in caption_norm:
                    if abs(block_bbox[1] - cbbox.y0) < 15:
                        elements.append((y_pos, "image", md_ref))
                        is_caption = True
                        break
        if is_caption:
            continue  # Skip caption text, screenshot replaces it

        block_y = block_bbox[1]
        elements.append((block_y, "text", block))

    # 3. Collect tables
    for bbox, md_table in tables:
        elements.append((bbox[1], "table", md_table))

    # 4. Collect images
    page_images: List[Tuple[float, str]] = []
    if images_dir is not None:
        images_dir.mkdir(parents=True, exist_ok=True)
        page_images = _extract_page_images(doc, page, page_num, images_dir)
    for y_pos, img_md in page_images:
        elements.append((y_pos, "image", img_md))

    # 5. Sort by vertical position (top to bottom), then by type priority
    # text < table < image to keep natural reading order when y is identical
    type_priority = {"text": 0, "table": 1, "image": 2}
    elements.sort(key=lambda x: (x[0], type_priority.get(x[1], 99)))

    # 6. Render
    lines: List[str] = []
    for _, kind, data in elements:
        if kind == "text":
            block_lines = _render_text_block(data, page_num)
            if block_lines:
                lines.extend(block_lines)
        elif kind == "table":
            lines.append(f"\n{data}\n")
        elif kind == "image":
            lines.append(data)

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API: Read multiple PDF pages
# ═══════════════════════════════════════════════════════════════════════════════

def read_pdf_pages(page_start: int, page_end: int, pdf_path: Path,
                   images_dir: Optional[Path] = None) -> str:
    """
    Read a range of PDF pages and convert to Markdown.

    Args:
        page_start: 1-based start page number.
        page_end:   1-based end page number (inclusive).
        pdf_path:   Path to the PDF file.
        images_dir: If provided, extract page images to this directory.

    Returns:
        Markdown string for the page range, with page headers.
        On failure, returns a string starting with "[ERROR]".
    """
    try:
        import fitz
    except ImportError as e:
        return f"[ERROR] PyMuPDF (fitz) not installed: {e}"

    if page_start > page_end:
        return f"[ERROR] Invalid range: start {page_start} > end {page_end}"

    try:
        doc = fitz.open(pdf_path)
        total_pdf_pages = len(doc)

        if page_start < 1 or page_end > total_pdf_pages:
            doc.close()
            return f"[ERROR] Page range {page_start}-{page_end} out of range (1-{total_pdf_pages})"

        all_lines: List[str] = []

        for page_num in range(page_start, page_end + 1):
            page = doc[page_num - 1]  # 0-based index

            all_lines.append(f"\n\n## Page {page_num}\n")
            page_lines = _render_page(page, page_num, doc, images_dir)
            all_lines.extend(page_lines)

        doc.close()

    except Exception as e:
        return f"[ERROR] Failed to read PDF pages {page_start}-{page_end}: {e}"

    return "\n".join(all_lines)


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API: Read a single PDF page (backward-compatible)
# ═══════════════════════════════════════════════════════════════════════════════

def read_pdf_page(page_num: int, pdf_path: Path,
                  images_dir: Optional[Path] = None) -> str:
    """
    Read a single PDF page and convert to Markdown.

    Backward-compatible wrapper around read_pdf_pages.
    """
    return read_pdf_pages(page_num, page_num, pdf_path, images_dir)
