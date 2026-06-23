#!/usr/bin/env python3
"""Fix teasers that are in English but should match the post's language."""
import json, subprocess, time, urllib.request

env = json.loads(subprocess.run(
    ["railway", "variables", "--json"],
    capture_output=True, text=True, cwd="/Users/peter/wildlyplay"
).stdout)

ANTHROPIC_KEY = env["ANTHROPIC_API_KEY"]
SUPABASE_URL = env["SUPABASE_URL"]
SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS_SB = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}

LANG_NAMES = {"vi": "Vietnamese", "th": "Thai", "es": "Spanish"}

PROMPT = """Translate this football article teaser from English to {lang_name}.
Keep it sharp, punchy, 130-155 characters. Same meaning, natural {lang_name}.
Do NOT add anything new. Just translate.

English teaser: {teaser}

Write ONLY the translated teaser, nothing else."""


def fetch_posts():
    url = f"{SUPABASE_URL}/rest/v1/posts?select=id,lang,title,meta_description,body_md&lang=neq.en&limit=500"
    req = urllib.request.Request(url, headers=HEADERS_SB)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def translate_teaser(teaser, target_lang):
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 200,
        "messages": [{"role": "user", "content": PROMPT.format(lang_name=LANG_NAMES[target_lang], teaser=teaser)}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=payload,
        headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["content"][0]["text"].strip()


def update_meta(post_id, teaser):
    url = f"{SUPABASE_URL}/rest/v1/posts?id=eq.{post_id}"
    req = urllib.request.Request(url, data=json.dumps({"meta_description": teaser}).encode(),
                                 headers={**HEADERS_SB, "Prefer": "return=minimal"}, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return resp.status


def is_english(text):
    if not text:
        return False
    en_starts = ['the ', 'a ', 'an ', 'our ', 'both ', 'japan', 'brazil', 'spain', 'usa',
                 'morocco', 'suspended', 'five ', 'canada', 'south ', 'australia', 'ecuador',
                 'mexico', 'netherlands', 'belgium', 'uruguay', 'czech', 'austria', 'england',
                 'germany', 'ghana', 'portugal', 'tunisia', 'scotland', 'haiti', 'swiss',
                 'uzbek', 'three ', 'two ', 'one ', "sweden's", "turkey's", "croatia's"]
    return any(text.lower().startswith(w) for w in en_starts)


def main():
    posts = fetch_posts()
    needs_fix = [p for p in posts if is_english(p.get("meta_description"))]
    print(f"Fixing {len(needs_fix)} posts with English teasers")

    fixed = 0
    for i, p in enumerate(needs_fix):
        try:
            translated = translate_teaser(p["meta_description"], p["lang"])
            status = update_meta(p["id"], translated)
            print(f"  [{i+1}/{len(needs_fix)}] {p['lang']} {p['title'][:40]}... → {translated[:60]}... ({status})")
            fixed += 1
            time.sleep(0.3)
        except Exception as e:
            print(f"  [{i+1}/{len(needs_fix)}] FAILED: {e}")

    print(f"\nDone! Fixed {fixed}/{len(needs_fix)}")


if __name__ == "__main__":
    main()
