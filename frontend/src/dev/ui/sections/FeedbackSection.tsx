import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import type { ButtonVariant } from '../../../components/ui/buttonStyles';
import { FeedbackSheet, type FeedbackVariant } from '../../../components/ui/FeedbackSheet';
import { Specimen } from '../CatalogSection';

interface FeedbackExample {
  variant: FeedbackVariant;
  trigger: string;
  button: ButtonVariant;
  solution?: string;
  explanation?: string;
  hint?: string;
}

// Example answer from PRD chapter 9 ("Das Haus ist gross.").
const EXAMPLES: FeedbackExample[] = [
  {
    variant: 'correct',
    trigger: 'Richtig',
    button: 'success',
    explanation: 'Der bestimmte Artikel wird angehängt: shpi → shpija.',
  },
  {
    variant: 'almost',
    trigger: 'Fast richtig',
    button: 'warning',
    solution: 'Shpija âsht e madhe.',
    hint: 'Achte auf den Zirkumflex: «âsht» statt «asht».',
  },
  {
    variant: 'standard',
    trigger: 'Standard',
    button: 'secondary',
    solution: 'Shpija âsht e madhe.',
    hint: '«është» ist Standard-Albanisch. Auf Gheg sagt man «âsht».',
  },
  {
    variant: 'wrong',
    trigger: 'Falsch',
    button: 'danger',
    solution: 'Shpija âsht e madhe.',
    explanation: 'Der bestimmte Artikel wird angehängt: shpi → shpija.',
  },
];

export function FeedbackSection() {
  // The example stays set after closing so the sheet keeps its content during the exit animation.
  const [example, setExample] = useState<FeedbackExample | null>(null);
  const [open, setOpen] = useState(false);

  const show = (next: FeedbackExample) => {
    setExample(next);
    setOpen(true);
  };

  return (
    <>
      <Specimen label="Feedback-Leiste öffnen" layout="grid">
        {EXAMPLES.map((item) => (
          <Button key={item.variant} variant={item.button} onClick={() => show(item)}>
            {item.trigger}
          </Button>
        ))}
      </Specimen>
      {example && (
        <FeedbackSheet
          open={open}
          variant={example.variant}
          solution={example.solution}
          solutionLang="sq"
          explanation={example.explanation}
          hint={example.hint}
          onContinue={() => setOpen(false)}
        />
      )}
    </>
  );
}
