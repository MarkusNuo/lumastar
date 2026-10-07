import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { renderWithQueryClient } from './http';

type Entry = string | { pathname: string; search?: string; state?: unknown };

/** Renders the routes in a memory router at `entry`; returns the router to check where it went. */
export function renderRoutes(routes: RouteObject[], entry: Entry) {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  return { router, ...renderWithQueryClient(<RouterProvider router={router} />) };
}

/** A stand-in screen that only shows its name, e.g. where a redirect leads. */
export function screenNamed(name: string) {
  return <h1>{name}</h1>;
}
