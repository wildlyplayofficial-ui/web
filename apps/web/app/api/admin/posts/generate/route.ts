/**
 * POST /api/admin/posts/generate
 * AI regeneration endpoint for admin post management (Phase 2).
 * Auth: Supabase session (admin cookies), NOT just REVALIDATE_SECRET.
 * Model: Haiku for translate, Sonnet for content generation.
 * Safety: writes to body_md_draft, never overwrites live body_md.
 */
import { getAdminSession } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase-server";
import {
  callClaude,
  HAIKU,
  SONNET,
  POST_FLAGS,
  LANG_NAMES,
  splitLangSectionsStrict,
} from "@/lib/ai";
import type { PostType } from "@/lib/types";

const TYPE_DESC: Record<PostType, string> = {
  recap: "post-match recap evaluating whether the pre-match thesis played out",
  preview: "pre-match preview expanding the Curator's thesis into analysis",
  analysis: "in-depth analytical piece on the match",
  news: "newsroom article about the match",
  "post-mortem": "honest post-mortem review of the result",
  "no-play": "explanation of why the Curator passed on this match",
};

function buildPickContext(picks: Record<string, unknown>[]): string {
  if (picks.length === 0) return "No pick data available.";
  return picks
    .map((p) => {
      const parts = [
        `Match: ${p.home_team} vs ${p.away_team}`,
        `League: ${p.league}`,
        `Pick: ${p.selection} @ ${p.odds_publish} (${p.market}, line: ${p.line ?? "n/a"}, stake: ${p.stake_units}u)`,
        `Thesis: ${p.thesis}`,
      ];
      if (p.home_score != null) parts.push(`Score: ${p.home_score}-${p.away_score}`);
      if (p.raw_outcome) parts.push(`Outcome: ${p.raw_outcome} (${p.units_pl ?? 0}u)`);
      return parts.join("\n");
    })
    .join("\n---\n");
}

function buildRegenAllPrompt(
  type: PostType,
  picks: Record<string, unknown>[],
): string {
  return `<role>
You write ${TYPE_DESC[type]} articles for the WildlyPlay newsroom (wildlyplay.com/news).
</role>

<context>
${buildPickContext(picks)}
</context>

<rules>
- Work ONLY from the data above — do NOT invent injuries, lineups, stats, quotes, or match events.
- NEVER use "sure win", "guaranteed", "can't lose", or promise profit.
- BANNED VOCABULARY: edge, value, value bet, +EV, beat the bookie.
- Lead with thesis evaluation, never generic match summaries.
- End each section with: Human-picked, AI-written.
</rules>

<output>
Write exactly FOUR sections: English under ${POST_FLAGS.en}, Vietnamese under ${POST_FLAGS.vi}, Thai under ${POST_FLAGS.th}, Spanish under ${POST_FLAGS.es}.
Each section: 150-250 words, markdown allowed (short paragraphs, no H1).
</output>`;
}

function buildSectionPrompt(
  body: string,
  section: string,
  picks: Record<string, unknown>[],
): string {
  return `<context>
Current article:
---
${body}
---

Pick data:
${buildPickContext(picks)}
</context>

<task>
Rewrite ONLY the "${section}" section. Keep all other sections exactly as they are.
Sections defined as: title = opening headline/hook, intro = first 1-2 paragraphs, analysis = main analytical body, conclusion = final paragraph + disclosure.
Output the COMPLETE article with only the "${section}" section rewritten.
</task>

<rules>
- Work ONLY from the pick data — do NOT invent facts.
- BANNED VOCABULARY: edge, value, value bet, +EV, beat the bookie.
- Keep the disclosure: Human-picked, AI-written.
</rules>`;
}

function buildTranslatePrompt(
  body: string,
  sourceLang: string,
  targetLang: string,
): string {
  return `Translate the following ${LANG_NAMES[sourceLang]} text to ${LANG_NAMES[targetLang]}.
Preserve all markdown formatting, paragraph structure, and meaning exactly.
Do not add, remove, or modify content — pure translation only.
Keep "Human-picked, AI-written." as is (do not translate).

---
${body}
---`;
}

function buildCuratorNotePrompt(picks: Record<string, unknown>[]): string {
  return `<role>
You write the Curator's Note for WildlyPlay articles — the Curator's honest perspective.
</role>

<context>
${buildPickContext(picks)}
</context>

<task>
Write a Curator's Note (100-150 words) evaluating the thesis, explaining the reasoning, and giving an honest take. Write in first person as "The Curator".
</task>

<rules>
- Honest, analytical, no hype.
- Work ONLY from the pick data — do NOT invent facts.
- BANNED VOCABULARY: edge, value, value bet, +EV, beat the bookie, sure win, guaranteed.
</rules>`;
}

export async function POST(request: Request): Promise<Response> {
  const user = await getAdminSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, mode, section, targetLang } = await request.json();
  if (!postId || !mode)
    return Response.json({ error: "postId and mode required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );

  const sb = getServiceSupabase();
  if (!sb)
    return Response.json({ error: "Database not configured" }, { status: 500 });

  const { data: post } = await sb
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (!post)
    return Response.json({ error: "Post not found" }, { status: 404 });

  // Load pick data — required for all modes except translate
  const pickIds: string[] = post.pick_ids ?? [];
  let picks: Record<string, unknown>[] = [];
  if (pickIds.length > 0) {
    const { data } = await sb.from("picks").select("*").in("id", pickIds);
    picks = (data ?? []) as Record<string, unknown>[];
  }

  if (picks.length === 0 && mode !== "translate") {
    return Response.json(
      { error: "No pick data — AI needs pick context to generate" },
      { status: 400 },
    );
  }

  try {
    if (mode === "regen_all") {
      const prompt = buildRegenAllPrompt(post.type as PostType, picks);
      const text = await callClaude(apiKey, SONNET, prompt, 3500);
      if (!text)
        return Response.json({ error: "AI generation failed" }, { status: 502 });

      // Strict: require ALL 4 lang flags to prevent lang contamination.
      // If model forgets a flag, text leaks into wrong lang section.
      const sections = splitLangSectionsStrict(text);
      if (!sections) {
        // Fallback: write raw text to CURRENT post only, don't touch siblings
        await sb.from("posts").update({ body_md_draft: text }).eq("id", postId);
        return Response.json({
          ok: true,
          draft: text,
          warning: "AI output missing lang flags — raw text saved to current post only. Review manually.",
        });
      }

      const updates: string[] = [];
      for (const [lang, body] of Object.entries(sections)) {
        const { data: sibling } = await sb
          .from("posts")
          .select("id")
          .eq("slug", post.slug)
          .eq("lang", lang)
          .maybeSingle();
        if (sibling) {
          await sb
            .from("posts")
            .update({ body_md_draft: body })
            .eq("id", sibling.id);
          updates.push(lang);
        }
      }
      return Response.json({
        ok: true,
        draft: sections[post.lang] ?? text,
        updatedLangs: updates,
      });
    }

    if (mode === "regen_section") {
      if (!section)
        return Response.json({ error: "section required" }, { status: 400 });
      const prompt = buildSectionPrompt(post.body_md, section, picks);
      const text = await callClaude(apiKey, SONNET, prompt, 2000);
      if (!text)
        return Response.json({ error: "AI generation failed" }, { status: 502 });

      await sb.from("posts").update({ body_md_draft: text }).eq("id", postId);
      await sb
        .from("posts")
        .update({ stale: true })
        .eq("slug", post.slug)
        .neq("id", postId);
      return Response.json({ ok: true, draft: text });
    }

    if (mode === "translate") {
      if (!targetLang)
        return Response.json({ error: "targetLang required" }, { status: 400 });
      const prompt = buildTranslatePrompt(post.body_md, post.lang, targetLang);
      const text = await callClaude(apiKey, HAIKU, prompt, 2000);
      if (!text)
        return Response.json(
          { error: "AI translation failed" },
          { status: 502 },
        );

      const { data: target } = await sb
        .from("posts")
        .select("id")
        .eq("slug", post.slug)
        .eq("lang", targetLang)
        .maybeSingle();

      if (target) {
        await sb
          .from("posts")
          .update({ body_md_draft: text })
          .eq("id", target.id);
        return Response.json({ ok: true, draft: text, targetPostId: target.id });
      }
      // Create new draft post for missing lang
      const { data: newPost } = await sb
        .from("posts")
        .insert({
          type: post.type,
          slug: post.slug,
          lang: targetLang,
          title: post.title,
          body_md: "",
          body_md_draft: text,
          pick_ids: post.pick_ids,
          status: "draft",
        })
        .select("id")
        .single();
      return Response.json({
        ok: true,
        draft: text,
        targetPostId: newPost?.id,
        created: true,
      });
    }

    if (mode === "regen_curator_note") {
      const prompt = buildCuratorNotePrompt(picks);
      const text = await callClaude(apiKey, SONNET, prompt, 500);
      if (!text)
        return Response.json({ error: "AI generation failed" }, { status: 502 });

      const noteHeader = "## Curator's Note";
      const body = post.body_md as string;
      let newBody: string;
      if (body.includes(noteHeader)) {
        const idx = body.indexOf(noteHeader);
        const nextH2 = body.indexOf("\n## ", idx + noteHeader.length);
        newBody =
          nextH2 > -1
            ? body.slice(0, idx) +
              `${noteHeader}\n\n${text}` +
              body.slice(nextH2)
            : body.slice(0, idx) + `${noteHeader}\n\n${text}`;
      } else {
        newBody = `${body}\n\n${noteHeader}\n\n${text}`;
      }

      await sb.from("posts").update({ body_md_draft: newBody }).eq("id", postId);
      await sb
        .from("posts")
        .update({ stale: true })
        .eq("slug", post.slug)
        .neq("id", postId);
      return Response.json({ ok: true, draft: newBody });
    }

    return Response.json({ error: "Invalid mode" }, { status: 400 });
  } catch {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
