import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { IconButton } from './IconButton';
import { TextField, type TextFieldProps } from './TextField';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>;

/** Password input whose value can be revealed, which prevents typos on phone keyboards. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <IconButton
          icon={visible ? EyeSlashIcon : EyeIcon}
          label="Passwort anzeigen"
          aria-pressed={visible}
          variant="ghost"
          size="sm"
          disabled={props.disabled}
          onClick={() => setVisible((current) => !current)}
        />
      }
    />
  );
}
