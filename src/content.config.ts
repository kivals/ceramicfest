import { defineCollection, z } from 'astro:content';

const seasons = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    year: z.number(),
    title: z.string(),
    layout: z.string(),
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
      items: z.array(z.object({
        url: z.string().url(),
        logo: image(),
        alt: z.string(),
      })),
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
      days: z.array(z.object({
        date: z.string(),
        location: z.string().optional(),
        events: z.array(z.object({ html: z.string() })),
        images: z.array(z.object({
          src: image(),
          alt: z.string(),
          ratio: z.enum(['pb100', 'pb140', 'pb177']).optional(),
        })).optional(),
      })).optional(),
    }).optional(),
    partners: z.object({
      groups: z.array(z.object({
        title: z.string(),
        intro: z.string().optional(),
        items: z.array(z.object({
          logo: image(),
          alt: z.string(),
          url: z.string().url().optional(),
        })),
      })),
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
        full: image(),
        thumb: image(),
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
        photo: image(),
        alt: z.string(),
      })),
    }).optional(),
  }),
});

const members = defineCollection({
  type: 'data',
  schema: ({ image }) => z.object({
    members: z.array(z.object({
      id: z.number(),
      name: z.string(),
      position: z.string().optional(),
      photo: image(),
      altText: z.string(),
      description: z.string(),
      additionalDescription: z.string(),
    })),
  }),
});

export const collections = { seasons, members };
