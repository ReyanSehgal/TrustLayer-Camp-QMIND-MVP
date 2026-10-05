import type { ReactNode } from "react";

// A small hover/focus tooltip. Detail lives here so the screen stays quiet.
export default function Tip({ tip, children, className = "" }: { tip: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`tw ${className}`}>
      {children}
      <span role="tooltip" className="tt">
        {tip}
      </span>
    </span>
  );
}
