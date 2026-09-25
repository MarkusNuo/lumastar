import type {
  FillGapExercise,
  LessonExercise,
  MatchPairsExercise,
  MultipleChoiceExercise,
  TranslateFreeExercise,
  TranslateWordbankExercise,
  WordOrderExercise,
} from './model';

/*
 * Exercises of content/units/a1_u01_greetings.json (plus one gap with a nasal vowel) for unit tests
 * and the component catalog. The app itself only plays exercises from the API.
 */

export const SAMPLE_MULTIPLE_CHOICE: MultipleChoiceExercise = {
  id: 'ex_a1_u01_greetings_001',
  reviewed: false,
  type: 'multiple_choice',
  prompt: { lang: 'de', text: 'Wie sagt man „guten Tag“?' },
  choices: ['mirëdita', 'mirupafshim', 'natën e mirë', 'faleminderit'],
  solutions: ['mirëdita'],
  explanation:
    '„Mirëdita“ ist der übliche Gruss am Tag. Im Kosovo sagt man es oft auch einfach als „Hallo“.',
};

export const SAMPLE_WORDBANK: TranslateWordbankExercise = {
  id: 'ex_a1_u01_greetings_005',
  reviewed: false,
  type: 'translate_wordbank',
  prompt: { lang: 'de', text: 'Guten Tag! Wie geht es dir?' },
  answerLang: 'sq',
  solutions: ['Mirëdita! Si je?', 'Mirëdita! Qysh je?'],
  wordBank: ['Mirëdita', 'Si', 'je', 'jeni', 'mirupafshim', 'jam'],
  explanation:
    '„Si je?“ ist die Du-Form. Im Kosovo fragt man auch „Qysh je?“ – beides heisst „Wie geht es dir?“.',
};

export const SAMPLE_TRANSLATE_FREE: TranslateFreeExercise = {
  id: 'ex_a1_u01_greetings_009',
  reviewed: false,
  type: 'translate_free',
  prompt: { lang: 'de', text: 'Einen Kaffee, bitte.' },
  answerLang: 'sq',
  solutions: [
    'Nji kafe, ju lutem.',
    'Nji kafe, të lutem.',
    'Ju lutem, nji kafe.',
    'Të lutem, nji kafe.',
  ],
  standardForms: [
    'Një kafe, ju lutem.',
    'Një kafe, të lutem.',
    'Ju lutem, një kafe.',
    'Të lutem, një kafe.',
  ],
  explanation:
    '„Nji“ ist die Gheg-Form von „ein, eine“ (Standard: „një“). „Ju lutem“ ist höflich, „të lutem“ sagst du zu Freunden.',
};

export const SAMPLE_TRANSLATE_FREE_NASAL: TranslateFreeExercise = {
  id: 'ex_a1_u01_greetings_010',
  reviewed: false,
  type: 'translate_free',
  prompt: { lang: 'de', text: 'Was machst du gerade?' },
  answerLang: 'sq',
  solutions: ['Çka po bân?', 'Çka bân?'],
  standardForms: ['Çfarë po bën?', 'Çfarë bën?', 'Çka po bën?'],
  explanation:
    'Im Kosovo fragt man „Çka po bân?“: „çka“ heisst „was“, „po“ zeigt, dass etwas gerade passiert.',
};

export const SAMPLE_FILL_GAP_CHOICES: FillGapExercise = {
  id: 'ex_a1_u01_greetings_012',
  reviewed: false,
  type: 'fill_gap',
  prompt: { lang: 'de', text: 'Gut, und du?' },
  answerLang: 'sq',
  text: 'Mirë, ___ ti?',
  solutions: ['po'],
  choices: ['po', 'jo', 'je', 'si'],
  standardForms: [],
  explanation:
    '„Po ti?“ heisst „Und du?“. Sonst bedeutet „po“ „ja“ – in der Gegenfrage aber „und“.',
};

export const SAMPLE_FILL_GAP_TYPED: FillGapExercise = {
  id: 'ex_a1_u01_greetings_014',
  reviewed: false,
  type: 'fill_gap',
  prompt: { lang: 'de', text: 'Mir geht es gut, danke. (wörtlich: „Gut bin ich, danke.“)' },
  answerLang: 'sq',
  text: 'Mirë ___, faleminderit.',
  solutions: ['jam'],
  standardForms: [],
  explanation: '„Jam“ heisst „ich bin“. „Mirë jam“ ist die übliche Antwort auf „Si je?“.',
};

/** PRD chapter 9 example: "Das Haus ist gross." with the Gheg nasal vowel. */
export const SAMPLE_FILL_GAP_NASAL: FillGapExercise = {
  id: 'ex_sample_nasal_001',
  reviewed: false,
  type: 'fill_gap',
  prompt: { lang: 'de', text: 'Das Haus ist gross.' },
  answerLang: 'sq',
  text: 'Shpija ___ e madhe.',
  solutions: ['âsht'],
  standardForms: ['është'],
  explanation: '„Âsht“ ist die Gheg-Form von „ist“ (Standard: „është“).',
};

export const SAMPLE_MATCH_PAIRS: MatchPairsExercise = {
  id: 'ex_a1_u01_greetings_015',
  reviewed: false,
  type: 'match_pairs',
  prompt: { lang: 'de', text: 'Ordne die Paare zu.' },
  pairs: [
    { left: 'mirëdita', right: 'guten Tag' },
    { left: 'mirupafshim', right: 'auf Wiedersehen' },
    { left: 'faleminderit', right: 'danke' },
    { left: 'ju lutem', right: 'bitte' },
    { left: 'natën e mirë', right: 'gute Nacht' },
  ],
  explanation: 'Diese fünf Wendungen brauchst du jeden Tag.',
};

export const SAMPLE_WORD_ORDER: WordOrderExercise = {
  id: 'ex_a1_u01_greetings_019',
  reviewed: false,
  type: 'word_order',
  prompt: { lang: 'de', text: 'Willkommen in Prishtina!' },
  answerLang: 'sq',
  tokens: ['Mirë', 'se', 'vjen', 'në', 'Prishtinë'],
  solutions: ['Mirë se vjen në Prishtinë!'],
  explanation: '„Mirë se vjen“ heisst wörtlich „gut, dass du kommst“. „Në“ heisst „in“.',
};

export const SAMPLE_EXERCISES: LessonExercise[] = [
  SAMPLE_MULTIPLE_CHOICE,
  SAMPLE_WORDBANK,
  SAMPLE_TRANSLATE_FREE,
  SAMPLE_FILL_GAP_CHOICES,
  SAMPLE_MATCH_PAIRS,
  SAMPLE_WORD_ORDER,
];
