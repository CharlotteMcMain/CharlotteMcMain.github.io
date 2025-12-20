import { defineCollection, z } from "astro:content";

const mcq = z.object({
  type: z.literal("mcq"),
  id: z.string(),
  topic: z.string().optional(),
  meta: z.string().optional(),
  marks: z.number().optional(),
  // ✅ no stem/options/correctId here anymore
});

const multipart = z.object({
  type: z.literal("multipart"),
  id: z.string(),
  topic: z.string().optional(),
  meta: z.string().optional(),
  parts: z.array(
    z.object({
      id: z.string(),
      marks: z.number().optional(),
      kind: z.union([z.literal("numeric"), z.literal("written")]),
      answer: z.number().optional(),
      tolerance: z.number().optional(),
      units: z.string().optional(),
    })
  ),
});

export const questions = defineCollection({
  type: "content",
  schema: z.discriminatedUnion("type", [mcq, multipart]),
});