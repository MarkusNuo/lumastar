import { ArrowRightIcon, CheckIcon, SpeakerHighIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { BUTTON_VARIANTS, type ButtonVariant } from '../../../components/ui/buttonStyles';
import { Specimen } from '../CatalogSection';

const VARIANT_LABEL: Record<ButtonVariant, string> = {
  primary: 'Primär',
  secondary: 'Sekundär',
  success: 'Richtig',
  danger: 'Falsch',
  warning: 'Hinweis',
  neutral: 'Neutral',
  ghost: 'Ghost',
  locked: 'Gesperrt',
};

export function ButtonsSection() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Specimen label="Varianten" layout="grid">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {VARIANT_LABEL[variant]}
          </Button>
        ))}
      </Specimen>
      <Specimen label="Grössen">
        <Button size="sm">Klein</Button>
        <Button size="md">Mittel</Button>
        <Button size="lg">Gross</Button>
      </Specimen>
      <Specimen label="Mit Icon">
        <Button variant="secondary" icon={SpeakerHighIcon}>
          Anhören
        </Button>
        <Button variant="success" icon={CheckIcon}>
          Fertig
        </Button>
      </Specimen>
      <Specimen label="Zustände (Laden: antippen)" layout="grid">
        <Button disabled>Deaktiviert</Button>
        <Button variant="neutral" disabled>
          Deaktiviert
        </Button>
        <Button loading={loading} onClick={() => setLoading(true)}>
          Speichern
        </Button>
        <Button variant="ghost" onClick={() => setLoading(false)}>
          Zurücksetzen
        </Button>
      </Specimen>
      <Specimen label="Volle Breite (Lektionsfuss)" layout="stack">
        <Button size="lg" fullWidth disabled>
          Prüfen
        </Button>
        <Button size="lg" fullWidth variant="success">
          Prüfen
        </Button>
        <Button size="lg" fullWidth variant="neutral" icon={ArrowRightIcon}>
          Überspringen
        </Button>
      </Specimen>
    </>
  );
}
