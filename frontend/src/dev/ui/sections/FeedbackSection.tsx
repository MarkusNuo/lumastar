import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import type { ButtonVariant } from '../../../components/ui/buttonStyles';
import { FeedbackSheet, type FeedbackVariant } from '../../../components/ui/FeedbackSheet';
import { TextField } from '../../../components/ui/TextField';
import { useShake } from '../../../lib/useShake';
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
    hint: 'Fast richtig – achte auf den Zirkumflex: **âsht**',
  },
  {
    variant: 'standard',
    trigger: 'Standard',
    button: 'secondary',
    solution: 'Shpija âsht e madhe.',
    hint: 'Richtig! Auf Gheg sagt man eher „âsht“ statt „është“.',
  },
  {
    variant: 'wrong',
    trigger: 'Falsch',
    button: 'danger',
    solution: 'Shpija âsht e madhe.',
    explanation: 'Der bestimmte Artikel wird angehängt: shpi → shpija.',
  },
];

function ShakeDemo() {
  const [scope, shake] = useShake();

  return (
    <div className="flex flex-col gap-3">
      <div ref={scope}>
        <TextField label="Passwort" type="password" error="Das Passwort stimmt nicht." />
      </div>
      <Button variant="danger" onClick={shake}>
        Schütteln
      </Button>
    </div>
  );
}

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
      <Specimen label="Hinweise: Fehler · Warten" layout="stack">
        <Callout tone="danger">Das hat nicht geklappt. Prüfe deine Verbindung.</Callout>
        <Callout tone="warning">Zu viele Fehlversuche. Mach kurz Pause.</Callout>
      </Specimen>
      <Specimen label="Falsche Eingabe schütteln" layout="stack">
        <ShakeDemo />
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
