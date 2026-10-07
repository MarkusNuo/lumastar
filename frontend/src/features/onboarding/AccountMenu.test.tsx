import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authStatus, profile } from '../../test/fixtures';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { authStatusQuery } from '../auth/authHooks';
import { AccountMenu } from './AccountMenu';

function renderMenu() {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(profile({ displayName: 'Erza', email: 'erza@example.ch' })),
    'GET /api/auth/status': () => jsonResponse(authStatus()),
    'POST /api/auth/logout': () => new Response(null, { status: 204 }),
  });
  const view = renderWithQueryClient(<AccountMenu />);
  view.queryClient.setQueryData(authStatusQuery.queryKey, authStatus({ authenticated: true }));
  return { ...view, requests, user: userEvent.setup() };
}

describe('AccountMenu', () => {
  it('shows who is signed in', async () => {
    const { user } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Konto' }));

    const sheet = screen.getByRole('dialog', { name: 'Dein Konto' });
    expect(sheet).toHaveTextContent('Erza');
    expect(await screen.findByText('erza@example.ch')).toBeInTheDocument();
  });

  it('signs out', async () => {
    const { queryClient, requests, user } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Konto' }));
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));

    await expect
      .poll(() => queryClient.getQueryData(authStatusQuery.queryKey)?.authenticated)
      .toBe(false);
    expect(requests.some((request) => request.url.endsWith('/api/auth/logout'))).toBe(true);
  });

  it('closes without signing out', async () => {
    const { requests, user } = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Konto' }));
    await user.keyboard('{Escape}');

    await expect.poll(() => screen.queryByRole('dialog')).toBeNull();
    expect(requests.some((request) => request.method === 'POST')).toBe(false);
  });
});
