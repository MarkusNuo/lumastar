import {
  AirplaneIcon,
  BriefcaseIcon,
  HeartIcon,
  HouseLineIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { OptionCard, type OptionResult } from '../../../components/ui/OptionCard';
import { Specimen } from '../CatalogSection';

const MC_OPTIONS = ['nâna', 'vena', 'shpija', 'âsht'];
const MC_ANSWER = 'nâna';

const MOTIVATIONS: { id: string; label: string; description: string; icon: Icon }[] = [
  {
    id: 'family',
    label: 'Familie & Partner',
    description: 'Mit meinen Liebsten reden',
    icon: HeartIcon,
  },
  {
    id: 'travel',
    label: 'Reisen',
    description: 'Kosovo und Albanien entdecken',
    icon: AirplaneIcon,
  },
  {
    id: 'work',
    label: 'Beruf',
    description: 'Im Job verstehen und verstanden werden',
    icon: BriefcaseIcon,
  },
  { id: 'heritage', label: 'Herkunft', description: 'Meine Wurzeln pflegen', icon: HouseLineIcon },
  { id: 'interest', label: 'Interesse', description: 'Einfach aus Neugier', icon: SparkleIcon },
];

function MultipleChoiceDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const resultFor = (option: string): OptionResult | undefined => {
    if (!checked) return undefined;
    if (option === MC_ANSWER) return 'correct';
    return option === selected ? 'wrong' : undefined;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lead font-extrabold">Wie sagt man «die Mutter»?</p>
      {MC_OPTIONS.map((option, index) => (
        <OptionCard
          key={option}
          label={option}
          labelLang="sq"
          marker={index + 1}
          selected={selected === option}
          result={resultFor(option)}
          disabled={checked}
          onClick={() => setSelected(option)}
        />
      ))}
      <Button
        size="lg"
        fullWidth
        className="mt-2"
        disabled={selected === null}
        variant={checked ? 'neutral' : 'primary'}
        onClick={() => {
          if (checked) setSelected(null);
          setChecked(!checked);
        }}
      >
        {checked ? 'Nochmals' : 'Prüfen'}
      </Button>
    </div>
  );
}

function MotivationDemo() {
  const [chosen, setChosen] = useState<string[]>(['family']);
  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <div className="flex flex-col gap-3">
      {MOTIVATIONS.map(({ id, label, description, icon: MotivationIcon }) => (
        <OptionCard
          key={id}
          label={label}
          description={description}
          marker={<MotivationIcon aria-hidden="true" size={20} weight="bold" />}
          selected={chosen.includes(id)}
          onClick={() => toggle(id)}
        />
      ))}
    </div>
  );
}

export function ChoicesSection() {
  return (
    <>
      <Specimen label="Multiple Choice: wählen, dann prüfen" layout="stack">
        <MultipleChoiceDemo />
      </Specimen>
      <Specimen label="Onboarding: Mehrfachauswahl" layout="stack">
        <MotivationDemo />
      </Specimen>
    </>
  );
}
