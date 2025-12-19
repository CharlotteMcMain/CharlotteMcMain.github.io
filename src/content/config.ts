// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { definitions } from "./definitions/config.ts";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),

    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(), // ✅ add (optional but useful)

    // ✅ add these (required for your TopicLanding filter/grouping)
    topic: z.string().optional(),
    type: z.enum(["notes", "past-papers", "misc"]).default("misc"),

    heroImage: z.string().optional(),
    heroCaption: z.string().optional(),
    tags: z.array(z.string()).default([]),
    kicker: z.string().optional(),
    prevHref: z.string().optional(),
    prevTitle: z.string().optional(),
    nextHref: z.string().optional(),
    nextTitle: z.string().optional(),

    spec: z
      .object({
        ocrA: z.array(z.string()).optional(),
        cie: z.array(z.string()).optional(),
        aqa: z.array(z.string()).optional(),
      })
      .optional(),

    relatedQuestions: z.array(z.string()).optional(), // slugs
  }),
});

const questions = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    questionId: z.string().optional(),
    tags: z.array(z.string()).default([]),
    examBoard: z.string().optional(),
    paper: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  }),
});

export const collections = {
  posts,
  questions,
  definitions,
};
