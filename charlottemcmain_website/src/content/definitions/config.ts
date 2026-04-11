import { defineCollection, z } from "astro:content";

export const definitions = defineCollection({
  type: "content",
  schema: z.object({
    term: z.string(),
    topic: z.string(),
  }),
});