import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PATHS } from './env.ts';

/* The units of the content the backend seeded (see PATHS.content), for facts the API does not send. */

export type ItemKind = 'word' | 'phrase' | 'grammar';

interface UnitFile {
  items?: { id: string; kind: ItemKind }[];
}

/** The kind of every item of content/units/*.json, by item id. */
export function readItemKinds(): Map<string, ItemKind> {
  const folder = path.join(PATHS.content, 'units');
  const kinds = new Map<string, ItemKind>();
  for (const file of readdirSync(folder).filter((name) => name.endsWith('.json'))) {
    const unit = JSON.parse(readFileSync(path.join(folder, file), 'utf8')) as UnitFile;
    for (const item of unit.items ?? []) kinds.set(item.id, item.kind);
  }
  return kinds;
}

/** The German labels of content/skill_tags.json, e.g. "Grundwortschatz". */
export function readSkillTagLabels(): string[] {
  const file = path.join(PATHS.content, 'skill_tags.json');
  const { tags } = JSON.parse(readFileSync(file, 'utf8')) as { tags: { label: string }[] };
  return tags.map((tag) => tag.label);
}

/** Only words and phrases count as learned words, grammar items do not. */
export const isVocabulary = (kind: ItemKind | undefined) => kind === 'word' || kind === 'phrase';
