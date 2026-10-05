import { useLocation, useNavigate } from 'react-router';

/**
 * Back to the previous screen of the app, or to `fallback` when this screen was opened directly
 * (a reload or a bookmark), where going back would leave the app.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  const { key } = useLocation();
  const openedDirectly = key === 'default';
  return () => void (openedDirectly ? navigate(fallback, { replace: true }) : navigate(-1));
}
