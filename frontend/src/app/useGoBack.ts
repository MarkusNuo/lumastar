import { useNavigate } from 'react-router';

/**
 * Back to the previous screen of the app, or to `fallback` when this screen was opened directly
 * (a link, a reload of the first page, a bookmark), where going back would leave the app.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate();
  return () => void (hasEarlierAppEntry() ? navigate(-1) : navigate(fallback, { replace: true }));
}

/**
 * React Router's browser history numbers its entries in `history.state.idx`, starting at 0 on the
 * page the app was opened with. Unlike the location key, a replace navigation (e.g. a corrected
 * search param) keeps that number, so it stays a reliable sign of an earlier entry in the app.
 */
function hasEarlierAppEntry(): boolean {
  const index = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof index === 'number' && index > 0;
}
