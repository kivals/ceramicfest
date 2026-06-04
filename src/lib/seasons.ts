import { getEntry, type CollectionEntry } from 'astro:content';

export type Season = CollectionEntry<'seasons'>['data'];

/**
 * Загружает сезон по году. Astro Content API сам валидирует через Zod.
 * Кидает понятную ошибку, если данных нет.
 */
export async function loadSeason(year: number): Promise<Season> {
  const entry = await getEntry('seasons', String(year));
  if (!entry) {
    throw new Error(`Season ${year} not found in src/content/seasons/`);
  }
  return entry.data;
}
