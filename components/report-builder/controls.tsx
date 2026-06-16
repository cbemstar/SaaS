"use client";

import { ColorInput, type BlockStyle } from "@/components/report-builder/fields";

export function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Labeled label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

export function TextControl({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Labeled label={label}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
      />
    </Labeled>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Labeled label={label}>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
      />
    </Labeled>
  );
}

const ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

export function StylePanel({ style, onChange }: { style?: BlockStyle; onChange: (style: BlockStyle) => void }) {
  const s = style ?? {};
  const set = (patch: Partial<BlockStyle>) => onChange({ ...s, ...patch });

  return (
    <div className="space-y-3">
      <SelectControl
        label="Text align"
        value={s.align ?? "left"}
        options={ALIGN_OPTIONS}
        onChange={(v) => set({ align: v as BlockStyle["align"] })}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberControl label="Padding ↕" value={s.paddingY} onChange={(v) => set({ paddingY: v })} />
        <NumberControl label="Padding ↔" value={s.paddingX} onChange={(v) => set({ paddingX: v })} />
      </div>
      <Labeled label="Background">
        <ColorInput value={s.background} onChange={(v) => set({ background: v })} />
      </Labeled>
      <Labeled label="Text colour">
        <ColorInput value={s.textColor} onChange={(v) => set({ textColor: v })} />
      </Labeled>
      <NumberControl label="Corner radius" value={s.radius} onChange={(v) => set({ radius: v })} />
    </div>
  );
}
