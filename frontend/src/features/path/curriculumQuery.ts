import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';

export const curriculumQuery = queryOptions({
  queryKey: ['curriculum'],
  queryFn: () => unwrap(api.GET('/api/curriculum')),
  // Content only changes with a new server release.
  staleTime: Infinity,
});
