import { LayoutGroup } from 'motion/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { WordTile, type WordTileState } from '../../../components/ui/WordTile';
import { Specimen } from '../CatalogSection';

const STATES: { state: WordTileState; label: string }[] = [
  { state: 'idle', label: 'shpija' },
  { state: 'selected', label: 'nâna' },
  { state: 'placed', label: 'âsht' },
  { state: 'disabled', label: 'vena' },
  { state: 'correct', label: 'mirë' },
  { state: 'wrong', label: 'shpi' },
];

// Demo sentence: "Das Haus ist gross.".
const WORDS = [
  { id: 'madhe', text: 'madhe' },
  { id: 'shpija', text: 'Shpija' },
  { id: 'vena', text: 'vena' },
  { id: 'e', text: 'e' },
  { id: 'asht', text: 'âsht' },
  { id: 'shpi', text: 'shpi' },
];
const SOLUTION = ['shpija', 'asht', 'e', 'madhe'];

function wordText(id: string): string {
  return WORDS.find((word) => word.id === id)?.text ?? id;
}

function WordBankDemo() {
  const [placed, setPlaced] = useState<string[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const toggle = (id: string) => {
    setResult(null);
    setPlaced((current) =>
      current.includes(id) ? current.filter((placedId) => placedId !== id) : [...current, id],
    );
  };
  const check = () => {
    setResult(placed.join(' ') === SOLUTION.join(' ') ? 'correct' : 'wrong');
  };

  return (
    <Card variant="outline">
      <p className="text-caption font-extrabold text-fg-muted uppercase">Übersetze</p>
      <p className="text-lead font-extrabold">Das Haus ist gross.</p>
      <LayoutGroup>
        <div className="mt-4 flex min-h-28 flex-wrap content-start gap-2 border-y-2 border-border py-3">
          {placed.map((id) => (
            <WordTile
              key={id}
              layoutId={id}
              lang="sq"
              state={result ?? 'idle'}
              onClick={() => toggle(id)}
            >
              {wordText(id)}
            </WordTile>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {WORDS.map((word) => (
            <WordTile
              key={word.id}
              layoutId={word.id}
              lang="sq"
              state={placed.includes(word.id) ? 'placed' : 'idle'}
              onClick={() => toggle(word.id)}
            >
              {word.text}
            </WordTile>
          ))}
        </div>
      </LayoutGroup>
      <Button size="lg" fullWidth className="mt-5" disabled={placed.length === 0} onClick={check}>
        Prüfen
      </Button>
    </Card>
  );
}

export function WordTilesSection() {
  return (
    <>
      <Specimen label="Zustände: normal · gewählt · platziert (Lücke) · deaktiviert · richtig · falsch">
        {STATES.map(({ state, label }) => (
          <WordTile key={state} state={state} lang="sq">
            {label}
          </WordTile>
        ))}
      </Specimen>
      <Specimen label="Interaktiv: antippen, dann prüfen" layout="stack">
        <WordBankDemo />
      </Specimen>
    </>
  );
}
