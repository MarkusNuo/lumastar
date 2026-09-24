import { LoadingDots } from '../components/ui/LoadingDots';

export function RouteFallback() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center text-primary-soft">
      <LoadingDots />
      <span className="sr-only">Wird geladen</span>
    </div>
  );
}
