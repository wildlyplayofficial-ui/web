#!/usr/bin/env python3
"""
Backfill newsroom teasers: generate AI meta_description for posts that don't have one.
Uses Anthropic API (key from Railway env) + Supabase direct.

Usage: python3 scripts/backfill-teasers.py
"""
import json
import subprocess
import sys
import time

# Get credentials from Railway
def get_railway_vars():
    result = subprocess.run(
        ["railway", "variables", "--json"],
        capture_output=True, text=True, cwd="/Users/peter/wildlyplay"
    )
    return json.loads(result.stdout)

env = get_railway_vars()
ANTHROPIC_KEY = env.get("ANTHROPIC_API_KEY", "")
SUPABASE_URL = env.get("SUPABASE_URL", "")
SUPABASE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not all([ANTHROPIC_KEY, SUPABASE_URL, SUPABASE_KEY]):
    print("Missing env vars")
    sys.exit(1)

import urllib.request

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

TEASER_PROMPT = """Write a sharp, punchy teaser for this football article card. Think ESPN/The Athletic headline writer — confident, specific, opinionated.

Style rules:
- 1-2 sentences, 130-155 characters MAX
- Open with the sharpest angle: a stat, a surprise, a tension ("X did Y — but Z")
- Use active voice, strong verbs, no filler words
- Each teaser MUST feel DIFFERENT from other teasers — vary structure, avoid repeating patterns like "X proves Y wrong" or "X meets Y"
- Create curiosity: hint at the insight without giving it away
- For recaps: lead with the unexpected part of the result, not just the score
- For previews: lead with the tactical tension or key matchup
- Match the article's language perfectly (EN/VI/TH/ES)
- NO clickbait, NO emojis, NO "you won't believe"
- Be factually accurate

BAD (generic): "Netherlands overwhelmed Sweden 5-1 in Group F, proving our thesis correct."
GOOD (sharp): "Five goals, one lesson: Sweden's gamble on a high line backfired within twelve minutes."

Article title: {title}
Article body (first 800 chars): {body}

Write ONLY the teaser text, nothing else."""


def fetch_posts_without_teaser():
    """Get all posts to regenerate teasers."""
    url = f"{SUPABASE_URL}/rest/v1/posts?select=id,title,body_md,lang,meta_description&limit=200"
    req = urllib.request.Request(url, headers=HEADERS_SB)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def generate_teaser(title, body):
    """Call Anthropic API to generate teaser."""
    prompt = TEASER_PROMPT.format(title=title, body=body[:800])
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 200,
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
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        return data["content"][0]["text"].strip()


def update_post_meta(post_id, teaser):
    """Update meta_description for a post."""
    url = f"{SUPABASE_URL}/rest/v1/posts?id=eq.{post_id}"
    payload = json.dumps({"meta_description": teaser}).encode()
    req = urllib.request.Request(url, data=payload, headers={**HEADERS_SB, "Prefer": "return=minimal"}, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return resp.status


def main():
    posts = fetch_posts_without_teaser()
    print(f"Found {len(posts)} posts without teaser")

    for i, post in enumerate(posts):
        try:
            teaser = generate_teaser(post["title"], post["body_md"] or "")
            status = update_post_meta(post["id"], teaser)
            print(f"  [{i+1}/{len(posts)}] {post['title'][:50]}... → {teaser[:80]}... (HTTP {status})")
            time.sleep(0.5)  # rate limit
        except Exception as e:
            print(f"  [{i+1}/{len(posts)}] FAILED: {e}")

    print(f"\nDone! {len(posts)} posts processed.")


if __name__ == "__main__":
    main()
