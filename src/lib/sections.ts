import Intro from '../components/sections/shared/Intro.astro';
import Philosophy from '../components/sections/shared/Philosophy.astro';
import Media from '../components/sections/shared/Media.astro';
import Members from '../components/sections/shared/Members.astro';
import Program from '../components/sections/shared/Program.astro';
import Partners from '../components/sections/shared/Partners.astro';
import Map from '../components/sections/shared/Map.astro';
import PhotoGallery from '../components/sections/shared/PhotoGallery.astro';
import MembersFull from '../components/sections/shared/MembersFull.astro';
import ReviewsList from '../components/sections/shared/ReviewsList.astro';

const sharedSections: Record<string, any> = {
  intro: Intro,
  philosophy: Philosophy,
  media: Media,
  members: Members,
  program: Program,
  partners: Partners,
  map: Map,
  photoGallery: PhotoGallery,
  membersFull: MembersFull,
  reviewsList: ReviewsList,
};

// Year-specific: glob-import всех компонентов из year-specific/{year}/*.astro.
const yearSpecific = import.meta.glob<{ default: any }>(
  '../components/sections/year-specific/*/*.astro',
  { eager: true }
);

export function resolveSection(year: string | number, name: string): any {
  // 1) Year-specific приоритет: ищем файл components/sections/year-specific/{year}/{Name}.astro
  const componentFileName = `/${capitalize(name)}.astro`;
  const ySKey = Object.keys(yearSpecific).find(
    k => k.includes(`/year-specific/${year}/`) && k.endsWith(componentFileName)
  );
  if (ySKey) return yearSpecific[ySKey].default;

  // 2) Общий банк
  if (sharedSections[name]) return sharedSections[name];

  // 3) Ничего не нашли — кидаем понятную ошибку на этапе билда
  throw new Error(`Section "${name}" not found for year ${year}. Add it to shared/ or year-specific/${year}/.`);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
