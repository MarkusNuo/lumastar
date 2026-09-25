import { useRef, useState } from 'react';
import { AnswerTextArea, type AnswerStatus } from '../../../components/ui/AnswerTextArea';
import { Button } from '../../../components/ui/Button';
import { PasswordField } from '../../../components/ui/PasswordField';
import { SpecialCharBar } from '../../../components/ui/SpecialCharBar';
import { TextField } from '../../../components/ui/TextField';
import { Toggle } from '../../../components/ui/Toggle';
import { Specimen } from '../CatalogSection';

function FreeAnswerDemo() {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<AnswerStatus | undefined>();
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const update = (value: string) => {
    setAnswer(value);
    setStatus(undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lead font-extrabold">Das Haus ist gross.</p>
      <AnswerTextArea
        ref={answerRef}
        label="Übersetzung auf Gheg"
        placeholder="Schreib deine Übersetzung"
        lang="sq"
        value={answer}
        status={status}
        onChange={(event) => update(event.target.value)}
      />
      <SpecialCharBar inputRef={answerRef} onChange={update} />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="success" onClick={() => setStatus('correct')}>
          Als richtig
        </Button>
        <Button variant="danger" onClick={() => setStatus('wrong')}>
          Als falsch
        </Button>
      </div>
    </div>
  );
}

function TogglesDemo() {
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Toggle
        label="Soundeffekte"
        description="Kurze Töne bei richtig und falsch"
        checked={sound}
        onChange={setSound}
      />
      <Toggle label="Vibration" checked={haptics} onChange={setHaptics} />
      <Toggle
        label="Erinnerungen"
        description="Kommt später"
        checked={false}
        onChange={() => undefined}
        disabled
      />
    </div>
  );
}

export function InputsSection() {
  const [name, setName] = useState('');

  return (
    <>
      <Specimen label="Textfeld: normal · Hinweis · Fehler" layout="stack">
        <TextField
          label="Anzeigename"
          placeholder="Wie sollen wir dich nennen?"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField label="Wohnort" hint="Freiwillig" />
        <TextField label="Deaktiviert" value="Nicht änderbar" disabled readOnly />
      </Specimen>
      <Specimen label="Passwort: sichtbar schaltbar · Hinweis · Fehler" layout="stack">
        <PasswordField label="Passwort" hint="Mindestens 8 Zeichen" />
        <PasswordField label="Passwort wiederholen" error="Die Passwörter stimmen nicht überein." />
      </Specimen>
      <Specimen label="Freitext mit Sonderzeichen-Leiste" layout="stack">
        <FreeAnswerDemo />
      </Specimen>
      <Specimen label="Schalter" layout="stack">
        <TogglesDemo />
      </Specimen>
    </>
  );
}
