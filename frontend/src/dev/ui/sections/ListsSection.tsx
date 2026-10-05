import {
  ArticleIcon,
  BrainIcon,
  DownloadSimpleIcon,
  SparkleIcon,
  SpeakerHighIcon,
  TimerIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { ActionList, ActionRow, SettingRow, ToggleRow } from '../../../components/ui/ActionList';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { MarkdownView } from '../../../components/ui/MarkdownView';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { Sheet, SheetHeader } from '../../../components/ui/Sheet';
import { Toast } from '../../../components/ui/Toast';
import { showToast } from '../../../components/ui/toastStore';
import { Specimen } from '../CatalogSection';

// Synthetic learner in the shape of learner_summary.md.
const SAMPLE_SUMMARY = `# Lernstand Mira – 25.09.2026 (Gheg, Kosovo)
- Niveau: A1.2 (Ziel C2), 4 Tage Streak, 38 Wörter
- Stärken: Begrüssung (86 %), Zahlen (78 %)
- Schwächen: Nasalvokale (42 %), Verben im Präsens (55 %)
- Häufige Fehler (14 Tage): Zirkumflex fehlt (6×), Standardform (3×)
- Letzte typische Fehler:
  - „Shpija asht e madhe“ → „Shpija âsht e madhe“ (Zirkumflex fehlt)
  - „mirdita“ → „mirëdita“ (Tippfehler)
`;

function SheetDemo() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = () => setOpen(false);

  return (
    <>
      <Button variant="secondary" icon={ArticleIcon} onClick={() => setOpen(true)}>
        Sheet öffnen
      </Button>
      <Sheet
        open={open}
        onClose={close}
        aria-labelledby={titleId}
        className="flex max-h-[88dvh] flex-col gap-4"
      >
        <SheetHeader titleId={titleId} title="KI-Zusammenfassung" onClose={close} />
        <div className="min-h-0 flex-1 overflow-y-auto rounded-card-sm border-2 border-border bg-bg p-4">
          <MarkdownView source={SAMPLE_SUMMARY} />
        </div>
        <Button size="lg" fullWidth onClick={close}>
          Fertig
        </Button>
      </Sheet>
    </>
  );
}

const GOALS = [5, 10, 15, 20].map((minutes) => ({ value: minutes, label: `${minutes} Min.` }));

/** The settings rows of the profile with local state instead of the server. */
function SettingsDemo() {
  const [goal, setGoal] = useState(10);
  const [sound, setSound] = useState(true);
  const [retention, setRetention] = useState(90);

  return (
    <ActionList title="Einstellungen">
      <SettingRow
        icon={TimerIcon}
        tone="secondary"
        label="Tagesziel"
        description={`${goal} Min. pro Tag`}
      >
        {({ labelId, descriptionId }) => (
          <SegmentedControl
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            options={GOALS}
            value={goal}
            onChange={setGoal}
          />
        )}
      </SettingRow>
      <ToggleRow
        icon={SpeakerHighIcon}
        label="Töne"
        description="Klänge für richtig, falsch und Lektionsende"
        checked={sound}
        onChange={setSound}
      />
      <SettingRow
        icon={BrainIcon}
        tone="unit-indigo"
        label="Ziel-Behaltensrate"
        aside={<span className="text-label font-black text-fg-muted">{retention} %</span>}
      >
        {({ labelId }) => (
          <input
            type="range"
            min={70}
            max={99}
            value={retention}
            aria-labelledby={labelId}
            aria-valuetext={`${retention} %`}
            onChange={(event) => setRetention(Number(event.target.value))}
            style={{ '--range-fill': `${((retention - 70) / 29) * 100}%` }}
            className="range w-full"
          />
        )}
      </SettingRow>
    </ActionList>
  );
}

export function ListsSection() {
  return (
    <>
      <Specimen label="Einstellungen: Auswahl, Schalter, Schieberegler" layout="stack">
        <SettingsDemo />
      </Specimen>
      <Specimen label="Aktionsliste: normal, lädt, deaktiviert" layout="stack">
        <ActionList title="Lerndaten">
          <ActionRow
            icon={SparkleIcon}
            label="KI-Zusammenfassung kopieren"
            description="Dein Lernstand für einen KI-Chat"
            onClick={() => showToast('Kopiert! Füge sie in einen KI-Chat ein.')}
          />
          <ActionRow
            icon={DownloadSimpleIcon}
            tone="unit-sky"
            label="Backup herunterladen"
            description="Alle Lerndaten als ZIP-Datei"
            loading
          />
          <ActionRow
            icon={UploadSimpleIcon}
            tone="warning"
            label="Backup importieren"
            description="Gerade nicht verfügbar"
            disabled
          />
        </ActionList>
      </Specimen>
      <Specimen label="Toasts: Erfolg und Info (oben eingeblendet)" layout="stack">
        <Toast message="Kopiert! Füge sie in einen KI-Chat ein." />
        <Toast tone="primary" message="Neue Inhalte sind da." onDismiss={() => undefined} />
        <Button
          variant="neutral"
          onClick={() => showToast('Backup gespeichert: lingora-export-2026-09-25.zip')}
        >
          Toast zeigen
        </Button>
      </Specimen>
      <Specimen label="Markdown (nur Überschriften, Listen, Fett)" layout="stack">
        <Card variant="outline">
          <MarkdownView source={SAMPLE_SUMMARY} />
        </Card>
      </Specimen>
      <Specimen label="Bottom Sheet mit Titel und Schliessen">
        <SheetDemo />
      </Specimen>
    </>
  );
}
