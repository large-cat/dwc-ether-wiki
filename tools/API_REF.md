# Knowledge Growth Engine API Reference

> Full implementation in `tools/knowledge_growth.py` is the source of truth.
> Only `get_or_load_content()` and `add_knowledge_leaf()` touch `raw/` and the write path.

---

## PDF Reader (Layer 1 → Layer 2)

### `get_or_load_content(chapter_id, page_start=None, page_end=None) -> str`

Cache-first lazy loader. The **only** function that reads from `raw/`.

```python
# First call -- reads from raw/, caches to wiki/
content = get_or_load_content("ch5", 167, 171)  # [CACHE MISS]

# Second call -- returns from cache instantly
content = get_or_load_content("ch5", 167, 171)  # [CACHE HIT]
```

---

## Knowledge Leaf Writer (Layer 2)

### `add_knowledge_leaf(chapter_id, topic, content, source="QA enrichment", confidence="high") -> str`

Persist an insight to the knowledge tree. **Content must be XML/HTML formatted**.

```python
leaf_id = add_knowledge_leaf("ch5", "RGMII时钟频率",
    "<h level=\"2\">RGMII时钟频率</h>\n\n"
    "<p>RGMII在千兆模式下使用<kbd>125MHz</kbd>参考时钟。</p>",
    confidence="high")
# -> "leaf_ch5_1"
```

> Leaf content uses semantic tags (`<h>`, `<p>`, `<ul>`, `<table>`, `<info>`, `<warning>`, `<register>`, `<field>`). See `wiki/leaf_schema.md`.

---

## Other Functions

These operate on `wiki/growing_knowledge_tree.json` and can also be done by direct file inspection:

| Function | Purpose |
|----------|---------|
| `scan_raw_for_new_docs()` | Check `raw/` for untracked PDFs |
| `add_document(filename, title, ...)` | Add a new PDF to the knowledge tree (one-time) |
| `search_knowledge(query)` | Search chapter titles and descriptions |
| `find_leaves(query, chapter_id)` | Search knowledge leaves |
| `merge_leaves(source_ids, ...)` | Merge multiple leaves into one (compile-time) |
| `split_leaf(source_id, parts)` | Split one leaf into multiple (compile-time) |
| `sync_leaves_to_markdown()` | Export JSON leaves to `wiki/leaves/*.md` |
| `wiki_sync()` | Bulk sync: leaves + overview + index |
| `get_stats()` / `print_stats()` | Show growth statistics |
