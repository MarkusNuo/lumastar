/** Paths the dev and preview servers proxy to the backend; the service worker never answers them. */
export const BACKEND_PATHS = ['/api', '/v3', '/actuator'] as const;

/** Navigations to the backend go to the network instead of falling back to the app shell. */
export const BACKEND_NAVIGATIONS = BACKEND_PATHS.map((path) => new RegExp(`^${path}(/|$)`));
