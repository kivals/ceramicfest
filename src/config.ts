/** Текущий активный сезон фестиваля. Меняется раз в год при подготовке нового. */
export const CURRENT_SEASON = 2026;

/**
 * Архивные годы, мигрированные в Astro (динамические маршруты [year]/*).
 * По мере миграции следующих сезонов список расширяется.
 * После переноса всех — заменяется автогенерацией из content/seasons/.
 */
export const ARCHIVE_YEARS: { year: number; slug: string; image: string; alt: string }[] = [
  { year: 2021, slug: '2021', image: '/img/history/2021.png', alt: 'Фестиваль керамика 2021 года' },
];
