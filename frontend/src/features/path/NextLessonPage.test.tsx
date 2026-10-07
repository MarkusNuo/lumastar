import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { NEXT_LESSON_ROUTE } from './lessonRoute';
import { NextLessonPage } from './NextLessonPage';

function renderNextLesson(path: () => Response) {
  stubApi({ 'GET /api/path': path });
  return renderRoutes(
    [
      { path: NEXT_LESSON_ROUTE, element: <NextLessonPage /> },
      { path: '/lesson/:unitId', element: screenNamed('Lektion') },
      { path: '/', element: screenNamed('Lernpfad') },
    ],
    NEXT_LESSON_ROUTE,
  );
}

describe('NextLessonPage', () => {
  it('starts the next lesson of the plan, without staying in the history', async () => {
    const { router } = renderNextLesson(() => jsonResponse(SAMPLE_PATH));

    expect(await screen.findByText('Lektion')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lesson/a1_u06_home');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('shows the learning path when the plan cannot be loaded', async () => {
    const { router } = renderNextLesson(() =>
      problemResponse({ status: 500, code: 'internal_error' }),
    );

    expect(await screen.findByText('Lernpfad')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
