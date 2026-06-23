#!/usr/bin/env python3
"""
Backfill missing ES/TH translations for newsroom posts.
Translates EN body + title + meta_description → target lang via Claude Haiku.
"""
import json
import subprocess
import sys
import time
import urllib.request
from collections import defaultdict

env = json.loads(subprocess.run(
    ["railway", "variables", "--json"],
    capture_output=True, text=True, cwd="/Users/peter/wildlyplay"
).stdout)

ANTHROPIC_KEY = env["ANTHROPIC_API_KEY"]
SUPABASE_URL = env["SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

LANG_NAMES = {"es": "Spanish", "th": "Thai", "vi": "Vietnamese"}

TRANSLATE_PROMPT = """Translate this football article from English to {lang_name}.
Keep the same structure, formatting (markdown), and tone.
Do NOT add or remove content. Keep team names in their original form.
Translate naturally, not word-by-word.

Title: {title}

Body:
{body}

Meta description (translate this too, keep under 160 chars):
{meta}

Return in this exact format:
TITLE: [translated title]
META: [translated meta description]
BODY:
[translated body]"""


def fetch_all_posts():
    url = f"{SUPABASE_URL}/rest/v1/posts?select=id,slug,lang,title,body_md,meta_description,type,pick_ids,status,published_at,meta_title,target_keyword,source_refs&limit=500"
    req = urllib.request.Request(url, headers=HEADERS_SB)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def translate(title, body, meta, target_lang):
    prompt = TRANSLATE_PROMPT.format(
        lang_name=LANG_NAMES[target_lang],
        title=title,
        body=body[:3000],
        meta=meta or title,
    )
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
        return data["content"][0]["text"].strip()


def parse_translation(text):
    title = ""
    meta = ""
    body = ""

    lines = text.split("\n")
    mode = None
    body_lines = []

    for line in lines:
        if line.startswith("TITLE:"):
            title = line[6:].strip()
            mode = "title"
        elif line.startswith("META:"):
            meta = line[5:].strip()
            mode = "meta"
        elif line.startswith("BODY:"):
            mode = "body"
        elif mode == "body":
            body_lines.append(line)

    body = "\n".join(body_lines).strip()
    return title, meta, body


def insert_post(post_data):
    url = f"{SUPABASE_URL}/rest/v1/posts"
    payload = json.dumps(post_data).encode()
    req = urllib.request.Request(url, data=payload, headers={**HEADERS_SB, "Prefer": "return=minimal"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status


def main():
    posts = fetch_all_posts()
    by_slug = defaultdict(dict)
    for p in posts:
        by_slug[p["slug"]][p["lang"]] = p

    tasks = []
    for slug, langs in by_slug.items():
        if "en" not in langs:
            continue
        for target in ["vi", "es", "th"]:
            if target not in langs:
                tasks.append((slug, target, langs["en"]))

    print(f"Found {len(tasks)} missing translations")

    created = 0
    for i, (slug, target_lang, en_post) in enumerate(tasks):
        try:
            raw = translate(en_post["title"], en_post["body_md"] or "", en_post.get("meta_description"), target_lang)
            title, meta, body = parse_translation(raw)

            if not title or not body:
                print(f"  [{i+1}/{len(tasks)}] PARSE FAILED: {slug} → {target_lang}")
                continue

            new_post = {
                "type": en_post["type"],
                "slug": slug,
                "lang": target_lang,
                "title": title,
                "body_md": body,
                "meta_description": meta or None,
                "meta_title": title,
                "pick_ids": en_post.get("pick_ids", []),
                "status": "published",
                "published_at": en_post.get("published_at"),
                "target_keyword": None,
                "source_refs": None,
            }

            status = insert_post(new_post)
            print(f"  [{i+1}/{len(tasks)}] {slug} → {target_lang}: {title[:50]}... (HTTP {status})")
            created += 1
            time.sleep(1)
        except Exception as e:
            print(f"  [{i+1}/{len(tasks)}] FAILED {slug} → {target_lang}: {e}")

    print(f"\nDone! Created {created}/{len(tasks)} translations.")


if __name__ == "__main__":
    main()
