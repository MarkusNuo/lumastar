import { SAMPLE_UNITS } from './sampleData';
import { UnitPath } from './UnitPath';

/** M0 placeholder of the learning path (Lernpfad) to judge the overall look. */
export function PathPreviewPage() {
  return (
    <div className="flex flex-col gap-10 pt-5">
      <h1 className="sr-only">Lernpfad</h1>
      {SAMPLE_UNITS.map((unit) => (
        <UnitPath key={unit.id} unit={unit} />
      ))}
    </div>
  );
}
