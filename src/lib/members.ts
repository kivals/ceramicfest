import { getEntry, type CollectionEntry } from 'astro:content';

export type Member = CollectionEntry<'members'>['data']['members'][number];

/**
 * Loads members collection entry and splits into preview/additional.
 * `slug` is the collection entry id (e.g. "2026" for members/2026.json).
 */
export async function loadMembersSplit(slug: string, previewCount: number) {
  const entry = await getEntry('members', slug);
  if (!entry) {
    throw new Error(`Members entry "${slug}" not found in src/content/members/`);
  }
  const all = entry.data.members;
  return {
    main: all.slice(0, previewCount),
    additional: all.slice(previewCount),
    total: all.length,
  };
}
