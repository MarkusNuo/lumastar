import {
  BookOpenTextIcon,
  GearIcon,
  SpeakerHighIcon,
  StarIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Card } from '../../../components/ui/Card';
import { IconButton } from '../../../components/ui/IconButton';
import { Specimen } from '../CatalogSection';

export function SurfacesSection() {
  return (
    <>
      <Specimen label="Karten" layout="stack">
        <Card variant="filled">
          <p className="text-body font-extrabold">Gefüllt</p>
          <p className="text-label text-fg-muted">Für Inhalte auf dem Hintergrund.</p>
        </Card>
        <Card variant="outline">
          <p className="text-body font-extrabold">Umrandet</p>
          <p className="text-label text-fg-muted">Für Listen und ruhige Gruppen.</p>
        </Card>
        <Card variant="raised">
          <p className="text-body font-extrabold">Erhaben</p>
          <p className="text-label text-fg-muted">Mit 3D-Kante, z. B. für Statistik-Kacheln.</p>
        </Card>
      </Specimen>
      <Specimen label="Icon-Buttons: Varianten">
        <IconButton icon={XIcon} label="Schliessen" variant="ghost" />
        <IconButton icon={GearIcon} label="Einstellungen" />
        <IconButton icon={SpeakerHighIcon} label="Anhören" variant="secondary" />
        <IconButton icon={StarIcon} label="Favorit" variant="primary" iconWeight="fill" />
        <IconButton icon={BookOpenTextIcon} label="Lernhilfe" variant="locked" />
      </Specimen>
      <Specimen label="Icon-Buttons: Grössen, Form, deaktiviert">
        <IconButton icon={SpeakerHighIcon} label="Anhören klein" variant="secondary" size="sm" />
        <IconButton icon={SpeakerHighIcon} label="Anhören mittel" variant="secondary" />
        <IconButton icon={SpeakerHighIcon} label="Anhören gross" variant="secondary" size="lg" />
        <IconButton
          icon={SpeakerHighIcon}
          label="Anhören rund"
          variant="secondary"
          size="lg"
          shape="circle"
        />
        <IconButton icon={GearIcon} label="Einstellungen deaktiviert" disabled />
      </Specimen>
    </>
  );
}
