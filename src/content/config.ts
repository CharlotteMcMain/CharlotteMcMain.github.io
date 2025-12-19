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

const base = z.object({
  title: z.string(),
  questionId: z.string(),
  board: z.string(),
  session: z.string(),
  code: z.string(),
  marks: z.number(),
  tags: z.array(z.string()).default([]),
  stem: z.string(),
});

const mcqSchema = base.extend({
  type: z.literal("mcq"),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  correctId: z.string(),
});

const longSchema = base.extend({
  type: z.literal("long"),
  parts: z.array(
    z.object({
      id: z.string(),
      label: z.string().optional(),
      text: z.string(),
      marks: z.number(),
      explanation: z.string().optional(),
      subparts: z
        .array(
          z.object({
            id: z.string(),
            label: z.string().optional(),
            text: z.string(),
            marks: z.number(),
            explanation: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
});

const questions = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("type", [mcqSchema, longSchema]),
});


export const collections = {
  posts,
  questions,
  definitions,
};
