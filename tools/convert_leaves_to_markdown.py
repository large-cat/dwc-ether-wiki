#!/usr/bin/env python3
"""
Convert existing leaf content from plain text to Markdown format.

Supported conversions:
  - Semicolon-separated items (； or ;) → Markdown bullet list
  - "支持：a；b；c" → heading + bullet list
  - "特性包括：a；b；c" → heading + bullet list
  - Consecutive key:value pairs → Markdown table
  - Paragraphs stay as paragraphs
"""
import json
import re


def split_semicolon_list(text: str) -> list[str] | None:
    """Split text by semicolons (Chinese or English) into items."""
    # Use Chinese semicolon first, then English
    if '；' in text:
        parts = [p.strip() for p in text.split('；') if p.strip()]
    elif ';' in text and len(text) > 40:
        parts = [p.strip() for p in text.split(';') if p.strip()]
    else:
        return None

    # Filter out parts that are too long (likely paragraphs, not list items)
    if not parts:
        return None
    avg_len = sum(len(p) for p in parts) / len(parts)
    if avg_len > 120 and len(parts) <= 2:
        return None
    return parts


def is_keyvalue_line(line: str) -> tuple[str, str] | None:
    """Check if line is a key:value pair. Returns (key, value) or None."""
    # Match "Key：value" or "Key: value" or "Key(value)" patterns
    m = re.match(r'^(.+?)(?:[：:]|\s*[(（])(.+)$', line)
    if not m:
        return None
    key = m.group(1).strip()
    val = m.group(2).strip()
    # Clean up trailing ) or ）
    val = re.sub(r'[)）]$', '', val).strip()

    # Heuristic: key should be reasonably short and not end with sentence punctuation
    if len(key) > 40 or key.endswith(('。', '，', '；', '.')):
        return None
    # Value should be non-empty
    if not val:
        return None
    # Key should look like a label, not a sentence
    if '。' in key:
        return None

    return (key, val)


def convert_leaf(content: str) -> str:
    lines = content.split('\n')
    result_lines: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # ── Pattern 1: "Prefix：item1；item2；item3" ──
        m = re.match(r'^(.*(?:支持|特性|包括|接口|信号|组件|操作|可选|包含|交付|优势)[：:]\s*)(.+)$', line)
        if m:
            prefix = m.group(1)
            body = m.group(2)
            items = split_semicolon_list(body)
            if items and len(items) >= 2:
                result_lines.append('')
                result_lines.append(f'{prefix.rstrip("：: ")}：')
                result_lines.append('')
                for item in items:
                    result_lines.append(f'- {item}')
                result_lines.append('')
                i += 1
                continue

        # ── Pattern 2: Whole line is semicolon-separated ──
        items = split_semicolon_list(line)
        if items and len(items) >= 3:
            result_lines.append('')
            for item in items:
                result_lines.append(f'- {item}')
            result_lines.append('')
            i += 1
            continue

        # ── Pattern 3: Consecutive key:value lines → table ──
        kv_block: list[tuple[str, str]] = []
        j = i
        while j < len(lines):
            l = lines[j].strip()
            if not l:
                j += 1
                continue
            kv = is_keyvalue_line(l)
            if kv:
                kv_block.append(kv)
                j += 1
            else:
                break

        if len(kv_block) >= 3:
            result_lines.append('')
            result_lines.append('| 项目 | 说明 |')
            result_lines.append('|------|------|')
            for key, val in kv_block:
                # Escape pipe characters in table cells
                key_esc = key.replace('|', '\\|')
                val_esc = val.replace('|', '\\|')
                result_lines.append(f'| {key_esc} | {val_esc} |')
            result_lines.append('')
            i = j
            continue

        # ── Pattern 4: Single key:value → bold inline ──
        kv = is_keyvalue_line(line)
        if kv and len(kv[0]) < 30:
            result_lines.append('')
            result_lines.append(f'**{kv[0]}**：{kv[1]}')
            result_lines.append('')
            i += 1
            continue

        # ── Default: paragraph ──
        result_lines.append(line)
        i += 1

    # Clean up consecutive empty lines
    cleaned: list[str] = []
    prev_empty = False
    for line in result_lines:
        is_empty = not line.strip()
        if is_empty and prev_empty:
            continue
        cleaned.append(line)
        prev_empty = is_empty

    return '\n'.join(cleaned).strip()


def main():
    with open('wiki/growing_knowledge_tree.json', 'r', encoding='utf-8') as f:
        tree = json.load(f)

    leaves = tree.get('leaves', {}).get('entries', [])
    changed = 0

    for leaf in leaves:
        old = leaf['content']
        new = convert_leaf(old)
        if new != old:
            leaf['content'] = new
            changed += 1
            print(f"  Converted: {leaf['id']} - {leaf['topic']}")

    with open('wiki/growing_knowledge_tree.json', 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)

    print(f"\nConverted {changed}/{len(leaves)} leaves to Markdown format.")


if __name__ == '__main__':
    main()
