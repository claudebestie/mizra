import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    author: z.string().default('Équipe Mizra'),
    tags: z.array(z.string()),
    keyword: z.string().optional(),
    lang: z.string().default('fr'),
    readingTime: z.string().optional(),
  }),
});

export const collections = { blog };
