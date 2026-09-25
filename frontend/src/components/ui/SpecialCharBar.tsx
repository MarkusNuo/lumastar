import { ArrowFatUpIcon } from '@phosphor-icons/react';
import { useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { cx } from '../../lib/cx';
import { insertAtSelection } from './insertText';
import { UI_COPY } from './copy';

const GHEG_SPECIAL_CHARS = ['ë', 'ç', 'â', 'ê', 'î', 'ô', 'û'] as const;

export interface SpecialCharBarProps {
  /** The controlled input or textarea that receives the characters. */
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  className?: string;
}

export function SpecialCharBar({ inputRef, onChange, className }: SpecialCharBarProps) {
  const [uppercase, setUppercase] = useState(false);

  const insert = (char: string) => {
    const field = inputRef.current;
    if (!field) return;
    const { value, selectionStart, selectionEnd } = field;
    const next = insertAtSelection(
      value,
      selectionStart ?? value.length,
      selectionEnd ?? value.length,
      char,
    );
    // Commit the new value synchronously so the caret can be placed right after the character.
    flushSync(() => {
      onChange(next.value);
    });
    field.focus();
    field.setSelectionRange(next.caret, next.caret);
  };

  return (
    <div
      role="group"
      aria-label={UI_COPY.specialChars.group}
      className={cx('grid grid-cols-8 gap-1.5', className)}
    >
      <CharKey
        label={UI_COPY.specialChars.shift}
        pressed={uppercase}
        onPress={() => setUppercase((current) => !current)}
      >
        <ArrowFatUpIcon aria-hidden="true" size={20} weight={uppercase ? 'fill' : 'bold'} />
      </CharKey>
      {GHEG_SPECIAL_CHARS.map((lower) => {
        const char = uppercase ? lower.toLocaleUpperCase('sq') : lower;
        return (
          <CharKey
            key={lower}
            label={UI_COPY.specialChars.insert(char)}
            onPress={() => insert(char)}
          >
            {char}
          </CharKey>
        );
      })}
    </div>
  );
}

interface CharKeyProps {
  label: string;
  pressed?: boolean;
  onPress: () => void;
  children: ReactNode;
}

// Cancelling mousedown keeps focus (and the mobile keyboard) on the text field.
const keepFocus = (event: MouseEvent) => event.preventDefault();

function CharKey({ label, pressed, onPress, children }: CharKeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-tone={pressed ? 'primary' : 'neutral'}
      onMouseDown={keepFocus}
      onClick={onPress}
      className="grid h-11 pressable place-items-center rounded-button-sm tone-outline text-lead font-extrabold"
    >
      {children}
    </button>
  );
}
