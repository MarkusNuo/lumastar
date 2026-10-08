import { MonitorPlayIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';

export interface ScreenPreviewProps {
  label: string;
  /** The full screen, given how it closes itself (e.g. with its continue button). */
  children: (close: () => void) => ReactNode;
}

/** Opens a full screen over the catalog; its own continue button closes it again. */
export function ScreenPreview({ label, children }: ScreenPreviewProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="neutral" icon={MonitorPlayIcon} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-(--z-sheet) overflow-y-auto bg-bg">
          {children(() => setOpen(false))}
        </div>
      )}
    </>
  );
}
