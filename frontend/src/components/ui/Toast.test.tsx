import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toaster } from './Toast';
import { showToast, useToastStore } from './toastStore';

beforeEach(() => {
  useToastStore.setState({ current: null });
});

describe('Toaster', () => {
  it('announces a toast in a status region that exists before the message', () => {
    render(<Toaster />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    act(() => showToast('Kopiert! Füge sie in einen KI-Chat ein.'));

    expect(region).toHaveTextContent('Kopiert! Füge sie in einen KI-Chat ein.');
  });

  it('hides the toast after its duration', async () => {
    render(<Toaster />);

    act(() => showToast('Backup gespeichert', { durationMs: 30 }));

    expect(screen.getByText('Backup gespeichert')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Backup gespeichert')).not.toBeInTheDocument());
  });

  it('closes on the dismiss button', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => showToast('Backup gespeichert'));

    await user.click(screen.getByRole('button', { name: 'Meldung schliessen' }));

    await waitFor(() => expect(screen.queryByText('Backup gespeichert')).not.toBeInTheDocument());
  });
});

describe('toastStore', () => {
  it('replaces the current toast, and a late dismiss of the old one keeps the new one', () => {
    showToast('Erste');
    const first = useToastStore.getState().current;
    showToast('Zweite', { tone: 'primary' });

    if (first) useToastStore.getState().dismiss(first.id);

    expect(useToastStore.getState().current).toMatchObject({ message: 'Zweite', tone: 'primary' });
  });
});
