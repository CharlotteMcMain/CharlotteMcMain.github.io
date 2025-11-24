import type { ReactNode } from "react";

type CalloutVariant = "recap" | "theorem" | "note" | "warning";

interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
}

const variantToLabel: Record<CalloutVariant, string> = {
  recap: "Recap",
  theorem: "Theorem",
  note: "Note",
  warning: "Warning",
};

export function Callout({
  variant = "note",
  title,
  children,
}: CalloutProps) {
  const label = title ?? variantToLabel[variant];

  return (
    <div className={`callout callout--${variant}`}>
      <div className="callout__title">{label}</div>
      <div className="callout__body">{children}</div>
    </div>
  );
}