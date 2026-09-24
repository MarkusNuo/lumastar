import { useState } from 'react';
import { Mascot, type MascotExpression } from '../../../components/ui/Mascot';
import { OptionCard } from '../../../components/ui/OptionCard';
import { Specimen } from '../CatalogSection';

const EXPRESSIONS: { expression: MascotExpression; label: string }[] = [
  { expression: 'happy', label: 'Freut sich' },
  { expression: 'encouraging', label: 'Ermutigt' },
  { expression: 'thinking', label: 'Denkt nach' },
  { expression: 'celebrating', label: 'Feiert' },
  { expression: 'sad', label: 'Traurig' },
];

function ExpressionPicker() {
  const [expression, setExpression] = useState<MascotExpression>('celebrating');

  return (
    <div className="flex flex-col items-center gap-4">
      <Mascot expression={expression} size="xl" />
      <div className="grid w-full grid-cols-2 gap-2">
        {EXPRESSIONS.map((item) => (
          <OptionCard
            key={item.expression}
            label={item.label}
            selected={item.expression === expression}
            onClick={() => setExpression(item.expression)}
          />
        ))}
      </div>
    </div>
  );
}

export function MascotSection() {
  return (
    <>
      <Specimen label="Alle Ausdrücke">
        <div className="grid w-full grid-cols-3 gap-4">
          {EXPRESSIONS.map(({ expression, label }) => (
            <figure key={expression} className="flex flex-col items-center gap-1">
              <Mascot expression={expression} size="md" />
              <figcaption className="text-caption font-bold text-fg-muted">{label}</figcaption>
            </figure>
          ))}
        </div>
      </Specimen>
      <Specimen label="Wechsel animiert" layout="stack">
        <ExpressionPicker />
      </Specimen>
    </>
  );
}
