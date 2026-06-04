import { defineCollection, z } from 'astro:content';

const mediaItem = z.object({
  url: z.string().url(),
  logo: z.string(),
  alt: z.string(),
});

const partnerItem = z.object({
  logo: z.string(),
  alt: z.string(),
  url: z.string().url().optional(),
});

const partnerGroup = z.object({
  title: z.string(),
  intro: z.string().optional(),
  items: z.array(partnerItem),
});

const programEvent = z.object({
  html: z.string(),
});

const programDay = z.object({
  date: z.string(),
  location: z.string().optional(),
  events: z.array(programEvent),
});

const seasonSchema = z.object({
  year: z.number(),
  title: z.string(),
  layout: z.string(),  // имя Layout-компонента, например "Year2026Layout"
  pages: z.object({
    index: z.object({ sections: z.array(z.string()) }),
    photos: z.object({ sections: z.array(z.string()) }).optional(),
    team: z.object({ sections: z.array(z.string()) }).optional(),
    reviews: z.object({ sections: z.array(z.string()) }).optional(),
  }),
  intro: z.object({}).passthrough().optional(),
  philosophy: z.object({
    title: z.string(),
    paragraphs: z.array(z.string()),
  }).optional(),
  media: z.object({
    title: z.string(),
    items: z.array(mediaItem),
  }).optional(),
  members: z.object({
    title: z.string(),
    dataFile: z.string(),
    previewCount: z.number().default(3),
    moreButtonLabel: z.string(),
  }).optional(),
  program: z.object({
    title: z.string(),
    status: z.enum(['placeholder', 'announced']),
    placeholderText: z.string().optional(),
    days: z.array(programDay).optional(),
  }).optional(),
  partners: z.object({
    groups: z.array(partnerGroup),
  }).optional(),
  map: z.object({
    title: z.string(),
    description: z.string(),
    embedUrl: z.string().url(),
  }).optional(),
  photoGallery: z.object({
    introText: z.string().optional(),
    vimeoIds: z.array(z.string()).optional(),
    folder: z.string(),
    photos: z.array(z.object({
      full: z.string(),
      thumb: z.string(),
      alt: z.string().default('Фото с фестиваля современной культуры'),
    })),
  }).optional(),
  reviewsList: z.object({
    introTitle: z.string().optional(),
    introText: z.string().optional(),
    pageTitle: z.string(),
    items: z.array(z.object({
      text: z.string(),
      author: z.string(),
      date: z.string(),
    })),
  }).optional(),
  membersFull: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    people: z.array(z.object({
      name: z.string(),
      position: z.string().optional(),
      photo: z.string(),
      alt: z.string(),
    })),
  }).optional(),
});

const seasons = defineCollection({
  type: 'data',
  schema: seasonSchema,
});

export const collections = { seasons };
