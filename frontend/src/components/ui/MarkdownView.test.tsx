import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('renders headings one level below the surrounding heading, and nested lists', () => {
    render(<MarkdownView source={'# Lernstand\n- Stärken: **Zahlen**\n  - 80 %'} />);

    expect(screen.getByRole('heading', { name: 'Lernstand', level: 3 })).toBeInTheDocument();
    const [outer, inner] = screen.getAllByRole('list');
    expect(outer).toHaveTextContent('Stärken: Zahlen');
    expect(inner).toHaveTextContent('80 %');
    expect(screen.getByText('Zahlen').tagName).toBe('STRONG');
  });

  it('follows a different parent heading level', () => {
    render(<MarkdownView source="# Titel" parentHeadingLevel={1} />);

    expect(screen.getByRole('heading', { name: 'Titel', level: 2 })).toBeInTheDocument();
  });

  it('never turns the text into HTML', () => {
    const { container } = render(
      <MarkdownView source={'<img src=x onerror=alert(1)>\n- <b>fett</b>'} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
