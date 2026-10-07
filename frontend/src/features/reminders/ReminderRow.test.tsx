import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ActionList } from '../../components/ui/ActionList';
import {
  installFakePush,
  removeFakePush,
  SERVER_KEY_BYTES,
  type FakePushOptions,
} from '../../test/fakePush';
import { reminderSettings } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { REMINDER_COPY } from './copy';
import { REMINDER_ROUTE } from './reminderRoutes';
import { ReminderRow } from './ReminderRow';

function renderRow(push: FakePushOptions, enabled: boolean) {
  installFakePush(push);
  stubApi({ 'GET /api/reminders': () => jsonResponse(reminderSettings({ enabled })) });
  return renderRoutes(
    [
      {
        path: '/profil',
        element: (
          <ActionList title="Einstellungen">
            <ReminderRow />
          </ActionList>
        ),
      },
      { path: REMINDER_ROUTE, element: screenNamed('Erinnerungen') },
    ],
    '/profil',
  );
}

const row = () => screen.getByRole('button', { name: REMINDER_COPY.row.label });

afterEach(() => {
  removeFakePush();
});

describe('ReminderRow', () => {
  it('names the time while this device reminds', async () => {
    renderRow({ permission: 'granted', subscribedWith: SERVER_KEY_BYTES }, true);

    expect(await screen.findByText(REMINDER_COPY.row.on('19:00'))).toBeInTheDocument();
  });

  it('says off on a device without subscription, even when another one reminds', async () => {
    renderRow({ permission: 'granted' }, true);

    expect(await screen.findByText(REMINDER_COPY.row.off)).toBeInTheDocument();
  });

  it('opens the reminder settings', async () => {
    const { router } = renderRow({}, false);

    await userEvent.setup().click(row());

    expect(router.state.location.pathname).toBe(REMINDER_ROUTE);
  });
});
