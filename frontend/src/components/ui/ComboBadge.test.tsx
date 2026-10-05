import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComboBadge } from './ComboBadge';

describe('ComboBadge', () => {
  it('announces the run of correct answers in a status region', () => {
    const { rerender } = render(<ComboBadge count={null} />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    rerender(<ComboBadge count={5} />);

    expect(region).toHaveTextContent('5 richtig in Folge!');
  });
});
