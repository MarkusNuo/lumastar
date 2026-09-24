import { at } from '../report.mjs';
import { wordsOf } from '../text.mjs';
import { exercisesOf, itemsOf } from '../walk.mjs';

/**
 * Standard-only forms (content/gheg_blocklist.json) must never appear in Gheg texts: solutions, tokens,
 * word-bank entries, gap texts and choices, Gheg prompts, left sides of pairs and item forms.
 * standardForms, explanations and error-hint patterns are deliberately not checked.
 */
export function checkGhegBlocklist(content, report) {
  const findStandardForms = createBlocklistMatcher(content.blocklist, report);
  if (!findStandardForms) return;

  const checkText = (file, location, text) => {
    for (const { word, gheg } of findStandardForms(text)) {
      report.error(file, location, `Gheg blocklist: "${word}" is a Standard form, use "${gheg}" (text: "${text}").`);
    }
  };

  for (const { doc, item, pointer } of itemsOf(content)) {
    for (const [path, text] of ghegTextsOfItem(item)) checkText(doc.path, at(`${pointer}${path}`, item.id), text);
  }
  for (const { doc, exercise, pointer } of exercisesOf(content)) {
    for (const [path, text] of ghegTextsOfExercise(exercise)) checkText(doc.path, at(`${pointer}${path}`, exercise.id), text);
  }
}

/** Builds `text → [{ word, gheg }]` from a valid blocklist document; reports broken patterns. */
function createBlocklistMatcher(blocklistDoc, report) {
  if (!blocklistDoc?.valid) return null;
  const { words, patterns } = blocklistDoc.data;
  const blockedWords = new Map(words.map((entry) => [entry.standard.normalize('NFC'), entry.gheg]));
  const blockedPatterns = patterns.flatMap((entry, index) => compilePattern(blocklistDoc.path, entry, `/patterns/${index}`, report));

  return (text) =>
    wordsOf(text).flatMap((word) => {
      if (blockedWords.has(word)) return [{ word, gheg: blockedWords.get(word) }];
      const pattern = blockedPatterns.find(({ regex, exceptions }) => regex.test(word) && !exceptions.has(word));
      return pattern ? [{ word, gheg: pattern.gheg }] : [];
    });
}

function compilePattern(file, entry, pointer, report) {
  let regex;
  try {
    regex = new RegExp(entry.pattern, 'u');
  } catch (error) {
    report.error(file, at(`${pointer}/pattern`, entry.id), `Invalid regex: ${error.message}`);
    return [];
  }
  for (const example of entry.examples.filter((word) => !regex.test(word))) {
    report.error(file, at(`${pointer}/examples`, entry.id), `Example "${example}" does not match the pattern.`);
  }
  for (const { word } of entry.exceptions.filter(({ word: candidate }) => !regex.test(candidate))) {
    report.error(file, at(`${pointer}/exceptions`, entry.id), `Exception "${word}" does not match the pattern and is not needed.`);
  }
  return [{ regex, gheg: entry.gheg, exceptions: new Set(entry.exceptions.map(({ word }) => word.normalize('NFC'))) }];
}

function* ghegTextsOfItem(item) {
  yield ['/gheg', item.gheg];
  if (item.definite) yield ['/definite', item.definite];
  if (item.plural) yield ['/plural', item.plural];
  for (const [index, alternative] of (item.alternatives ?? []).entries()) yield [`/alternatives/${index}`, alternative];
}

function* ghegTextsOfExercise(exercise) {
  if (exercise.prompt.lang === 'sq') yield ['/prompt/text', exercise.prompt.text];
  if (exercise.type === 'match_pairs') {
    for (const [index, pair] of exercise.pairs.entries()) yield [`/pairs/${index}/left`, pair.left];
  }
  // Multiple-choice solutions are checked whatever their language: blocked forms never occur in German.
  if (exercise.type !== 'multiple_choice' && exercise.answerLang !== 'sq') return;
  for (const field of ['solutions', 'tokens', 'wordBank']) {
    for (const [index, text] of (exercise[field] ?? []).entries()) yield [`/${field}/${index}`, text];
  }
  if (exercise.type === 'fill_gap') {
    yield ['/text', exercise.text];
    for (const [index, choice] of (exercise.choices ?? []).entries()) yield [`/choices/${index}`, choice];
  }
}
