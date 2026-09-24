# Content format contract

Shared contract between `/content` (validated by `content/schema/*.schema.json`)
and the backend seed importer (`app.lingora.content`). Based on PRD chapter 9.

All files are UTF-8 JSON with `"schemaVersion": 1`. All Gheg text follows `content/LANGUAGE_GUIDE.md`.

## Files

| File | Purpose |
|---|---|
| `content/curriculum.json` | Stages A0 → C2.3, their units (with or without exercise files) |
| `content/skill_tags.json` | Registry of every skill tag with German label and area |
| `content/units/<unitId>.json` | Items, grammar notes and exercises of one unit |
| `content/placement.json` | Placement item bank across all levels |

## Levels

Ordered stage codes: `A0`, `A1.1`, `A1.2`, `A1.3`, `A2.1`, `A2.2`, `A2.3`, `B1.1` … `C2.3` (19 stages).
Every stage ends with a checkpoint that is composed automatically from the stage's units.

## curriculum.json

```json
{
  "schemaVersion": 1,
  "variety": "gheg-kosovo",
  "stages": [
    {
      "level": "A1.1",
      "title": "Erste Gespräche",
      "units": [
        {
          "id": "a1_u01_greetings",
          "title": "Begrüssung & Höflichkeit",
          "description": "Grüssen, sich verabschieden, bitte und danke sagen.",
          "goals": ["Ich kann jemanden grüssen und mich verabschieden."],
          "skillTags": ["vocab.greetings", "phrase.politeness"],
          "color": "violet",
          "icon": "hand-waving",
          "estimatedLessons": 4,
          "file": "units/a1_u01_greetings.json"
        }
      ]
    }
  ]
}
```

- Unit ids: `^[a-z][a-z0-9_]*$`, globally unique. Order in the file is the path order.
- `color` ∈ `violet, teal, sky, rose, amber, lime, indigo, coral` (frontend maps them to tokens).
- `icon`: free icon key (frontend falls back to a default icon).
- `file` is omitted for units whose exercises are not written yet (all B1–C2 units in the MVP, and A0–A2
  units until M6). Such units have title, goals and tags only; the importer and the plan must handle them.

## skill_tags.json

```json
{ "schemaVersion": 1, "tags": [ { "id": "grammar.definite_article.fem", "label": "Bestimmter Artikel (feminin)", "area": "grammar" } ] }
```

- Tag ids: `^(vocab|phrase|grammar|spelling|reading)(\.[a-z0-9_]+)+$`.
- `area` ∈ `vocab` (Wortschatz), `phrase` (Wendungen), `grammar` (Grammatik), `spelling` (Schreiben), `reading` (Lesen).
- Every tag used anywhere must be registered here.

## units/&lt;unitId&gt;.json

```json
{
  "schemaVersion": 1,
  "unitId": "a1_u01_greetings",
  "level": "A1.1",
  "grammar": [ { "title": "Guten Tag!", "explanation": "Kurze Erklärung auf Deutsch (Markdown erlaubt)." } ],
  "items": [
    {
      "id": "item_mirdita",
      "kind": "phrase",
      "gheg": "mirëdita",
      "de": "guten Tag",
      "partOfSpeech": "interjection",
      "reviewed": false
    }
  ],
  "exercises": [ { "…": "see below" } ]
}
```

Item fields: `id` (`^item_[a-z0-9_]+$`, globally unique), `kind` ∈ `word, phrase, grammar`, `gheg`, `de`,
optional `partOfSpeech` ∈ `noun, verb, adjective, adverb, pronoun, preposition, conjunction, numeral,
interjection, particle, phrase, other`, optional `gender` ∈ `m, f, n` (nouns), optional `definite`
(definite form, e.g. `shpija`), optional `plural`, optional `alternatives` (other accepted Gheg spellings),
optional `note` (author note, e.g. uncertainty), `reviewed` (always `false` when generated).

## Exercises

Common fields (all types):

| Field | Rule |
|---|---|
| `id` | `^ex_[a-z0-9_]+_\d{3}$` in units, `^pl_[a-z0-9_]+_\d{3}$` in placement; globally unique |
| `type` | one of the types below |
| `level` | stage code |
| `difficulty` | 1 (easy) – 3 (hard) |
| `skillTags` | ≥ 1 registered tag |
| `itemIds` | referenced items (may be empty for pure grammar) |
| `competence` | `vocabulary, grammar, reading, translation` (required in `placement.json`, optional elsewhere) |
| `prompt` | `{ "lang": "de" \| "sq", "text": "…" }` — the task shown to the learner |
| `explanation` | short German explanation shown in the feedback sheet |
| `errorHints` | optional `[{ "pattern": "<regex>", "category": "<error category>", "hint": "<German>" }]`; regex is matched case-insensitively against the normalised wrong answer |
| `reviewed` | always `false` when generated |
| `source` | `manual` (content files) or `ai` (Phase 2) |
| `note` | optional author note |

Type-specific fields (`answerLang` ∈ `sq` (Gheg), `de`):

| Type | Fields |
|---|---|
| `multiple_choice` | `choices` (exactly 4 strings), `solutions` (exactly 1, contained in `choices`) |
| `translate_wordbank` | `answerLang`, `solutions` (≥ 1 accepted sentences), `wordBank` (all tokens of `solutions[0]` plus 2–4 distractors) |
| `translate_free` | `answerLang`, `solutions` (≥ 1), optional `standardForms` |
| `fill_gap` | `answerLang`, `text` (sentence with exactly one `___`), `solutions` (accepted gap fillers), optional `choices` (shown as chips; must contain `solutions[0]`), optional `standardForms` |
| `match_pairs` | `pairs`: exactly 5 `{ "left": "<Gheg>", "right": "<German>" }` with unique sides |
| `word_order` | `answerLang`, `tokens` (the tokens of `solutions[0]`, in correct order; the UI shuffles), `solutions` (≥ 1 accepted orderings) |

- `solutions` contain only Gheg forms (when `answerLang` is `sq`); Standard Albanian forms go to
  `standardForms` and are accepted as "richtig, aber Standard" with error tag `variant.standard_form`.
- Several Gheg spellings may be listed in `solutions`.
- P1/P2 types (`conjugation_drill`, `declension_drill`, `reading`, `free_writing`, `listen_select`) are
  reserved; their format is defined when they are implemented.

## Answer normalisation and tokenisation

Shared by the backend evaluator, the frontend pre-check and the content validator:

1. Unicode NFC, trim, lowercase, collapse whitespace to single spaces.
2. Strip punctuation `. , ! ? ; : " „ “ ” « » ' ’ ‘ ( ) - – — …` (keep letters, digits and spaces).
3. `errorHints` patterns are matched against the answer after steps 1–2 (diacritics are **kept**).
4. Diacritic folding for "almost correct" (`ë→e`, `ç→c`, `â→a`, `ê→e`, `î→i`, `ô→o`, `û→u`) is a separate,
   later comparison step.
5. Word-bank and word-order tokens: split the sentence on whitespace, strip surrounding punctuation from each
   token, compare case-insensitively.

## Error categories (PRD F6)

`vocab.unknown`, `vocab.confused`, `spelling.diacritics`, `spelling.nasal_vowel`, `spelling.other`,
`variant.standard_form`, `grammar.definite_article`, `grammar.case`, `grammar.linking_article`,
`grammar.gender`, `grammar.infinitive`, `grammar.participle`, `grammar.verb_conjugation`,
`grammar.verb_tense`, `grammar.word_order`, `grammar.clitics`.

## placement.json

```json
{ "schemaVersion": 1, "exercises": [ { "id": "pl_a1_1_001", "type": "multiple_choice", "level": "A1.1", "competence": "vocabulary", "…": "…" } ] }
```

Placement exercises use only auto-evaluable types (`multiple_choice`, `fill_gap`, `translate_wordbank`,
`word_order`, `translate_free`) and cover every stage and all four competences.
