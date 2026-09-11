import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** Shared selection and preview treatment for both 2D and 3D accessories. */
export function AccessoryCard({
  id,
  name,
  checked,
  enabled = true,
  onChange,
  children,
}: {
  id: string;
  name: string;
  checked: boolean;
  enabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className="attachment-item"
      title={enabled ? name : "当前骨架不支持"}
    >
      <input
        className="accessory-toggle"
        id={id}
        type="checkbox"
        checked={checked}
        disabled={!enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
      <strong>{name}</strong>
      {checked && <Check className="attachment-check" size={12} />}
    </label>
  );
}
