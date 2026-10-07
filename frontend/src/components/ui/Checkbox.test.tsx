import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './Checkbox';

function Consent({ error }: { error?: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      checked={checked}
      error={error}
      onChange={(event) => setChecked(event.target.checked)}
    >
      Ich habe die <a href="/datenschutz">Datenschutzerklärung</a> gelesen.
    </Checkbox>
  );
}

describe('Checkbox', () => {
  it('ticks and unticks by its label', async () => {
    const user = userEvent.setup();
    render(<Consent />);
    const box = screen.getByRole('checkbox', {
      name: 'Ich habe die Datenschutzerklärung gelesen.',
    });

    await user.click(screen.getByText(/Ich habe die/));
    expect(box).toBeChecked();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('describes itself by its error', () => {
    render(<Consent error="Bitte bestätigen." />);

    expect(screen.getByRole('checkbox')).toBeInvalid();
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription('Bitte bestätigen.');
  });
});
