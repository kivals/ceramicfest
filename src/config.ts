/** Текущий активный сезон фестиваля. Меняется раз в год при подготовке нового. */
export const CURRENT_SEASON = 2026;

/**
 * Архивные годы (включая «нестандартный» 2022_2 — фестиваль современной скульптуры).
 * В Phase 1 это статика в public/{slug}/.
 * В Phase 2 — заменяется автогенерацией из content/seasons/.
 */
export const ARCHIVE_YEARS: { year: number; slug: string; image: string; alt: string }[] = [
  { year: 2021,  slug: '2021',   image: '/img/history/2021.png',   alt: 'Фестиваль керамика 2021 года' },
  { year: 2022,  slug: '2022',   image: '/img/history/2022.jpg',   alt: 'Фестиваль керамика 2022 года' },
  { year: 20222, slug: '2022_2', image: '/img/history/2022_2.jpg', alt: 'Фестиваль современной скульптуры' },
  { year: 2023,  slug: '2023',   image: '/img/history/2023.jpg',   alt: 'Фестиваль Формула Трансформации' },
  { year: 2024,  slug: '2024',   image: '/img/history/2024.jpg',   alt: 'Фестиваль Млечный путь' },
  { year: 2025,  slug: '2025',   image: '/img/history/2025.jpg',   alt: 'Фестиваль Млечный путь 2025' },
];
