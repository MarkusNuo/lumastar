import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../api/types';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { settingsQuery } from './settingsApi';
import { useDeviceTimeZoneSync } from './useDeviceTimeZoneSync';

const STORED: Settings = {
  dailyGoalMinutes: 15,
  requestRetention: 0.85,
  timeZone: 'Europe/Zurich',
};

function onDevice(timeZone: string) {
  const options = new Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...options,
    timeZone,
  });
}

function renderSync(put: (request: Request) => Response | Promise<Response>) {
  const requests = stubApi({
    'GET /api/settings': () => jsonResponse(STORED),
    'PUT /api/settings': put,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useDeviceTimeZoneSync(), { wrapper });
  const puts = () => requests.filter((request) => request.method === 'PUT');
  return { ...hook, queryClient, puts };
}

const echo = async (request: Request) => jsonResponse(await request.clone().json());

describe('useDeviceTimeZoneSync', () => {
  it('stores the device time zone with the other settings unchanged', async () => {
    onDevice('America/New_York');
    const { queryClient, puts } = renderSync(echo);

    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(await puts()[0]?.json()).toEqual({ ...STORED, timeZone: 'America/New_York' });
    await waitFor(() =>
      expect(queryClient.getQueryData(settingsQuery.queryKey)?.timeZone).toBe('America/New_York'),
    );
  });

  it('leaves a matching time zone alone', async () => {
    onDevice('Europe/Zurich');
    const { queryClient, puts } = renderSync(echo);

    await waitFor(() => expect(queryClient.getQueryData(settingsQuery.queryKey)).toEqual(STORED));
    expect(puts()).toHaveLength(0);
  });

  it('tries only once per session, even when the save fails', async () => {
    onDevice('Asia/Tokyo');
    const { queryClient, puts, rerender } = renderSync(() =>
      problemResponse({ status: 400, code: 'validation_failed' }),
    );

    await waitFor(() => expect(puts()).toHaveLength(1));
    await queryClient.refetchQueries({ queryKey: settingsQuery.queryKey });
    rerender();

    expect(puts()).toHaveLength(1);
    expect(queryClient.getQueryData(settingsQuery.queryKey)).toEqual(STORED);
  });
});
