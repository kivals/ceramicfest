import fs from 'node:fs/promises';
import path from 'node:path';

export interface Member {
  id: number;
  name: string;
  position?: string;
  photo: string;
  altText: string;
  description: string;
  additionalDescription: string;
}

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content');

/**
 * Загружает список участников из указанного файла и делит на preview/additional.
 */
export async function loadMembersSplit(dataFile: string, previewCount: number) {
  const fullPath = path.join(CONTENT_ROOT, dataFile);
  const raw = await fs.readFile(fullPath, 'utf8');
  const parsed = JSON.parse(raw) as { members: Member[] };
  const all = parsed.members || [];
  return {
    main: all.slice(0, previewCount),
    additional: all.slice(previewCount),
    total: all.length,
  };
}
