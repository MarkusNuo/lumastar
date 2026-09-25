import { useState } from 'react';

/**
 * Word chips picked into the answer line, by their index in `words` (so duplicate words stay
 * distinct). Reports the picked words in answer order after every change.
 */
export function useWordBank(words: readonly string[], onChange: (picked: string[]) => void) {
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (index: number) => {
    const next = picked.includes(index)
      ? picked.filter((pickedIndex) => pickedIndex !== index)
      : [...picked, index];
    setPicked(next);
    onChange(next.map((pickedIndex) => words[pickedIndex] ?? ''));
  };

  return { picked, toggle };
}
