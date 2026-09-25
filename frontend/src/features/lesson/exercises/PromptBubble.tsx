import { MascotMessage } from '../../../components/ui/MascotMessage';
import type { ExercisePrompt, Verdict } from '../model';
import { mascotFor } from './exerciseProps';

/** The sentence to work on, spoken by the mascot, who reacts to the verdict. */
export function PromptBubble({ prompt, verdict }: { prompt: ExercisePrompt; verdict?: Verdict }) {
  return (
    <MascotMessage expression={mascotFor(verdict)}>
      <p lang={prompt.lang}>{prompt.text}</p>
    </MascotMessage>
  );
}
