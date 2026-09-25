type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribes to 401 responses of the API; returns the unsubscribe function. */
export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  for (const listener of listeners) listener();
}
