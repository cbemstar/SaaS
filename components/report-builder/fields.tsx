"use client";

import type { CSSProperties } from "react";
import type { Field } from "@measured/puck";

// Curated, web-safe + app-loaded font choices for the report builder.
export const FONT_OPTIONS = [
  { label: "Theme default", value: "" },
  { label: "Sans (Manrope)", value: "var(--font-display), system-ui, sans-serif" },
  { label: "Body (Source Sans)", value: "var(--font-sans), system-ui, sans-serif" },
  { label: "Mono (JetBrains)", value: "var(--font-mono), ui-monospace, monospace" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
];

export function ColorInput({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
        aria-label="Pick colour"
      />
      <input
        type="text"
        value={value ?? ""}
        placeholder="none"
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-xs text-muted-foreground hover:text-foreground">
          clear
        </button>
      )}
    </div>
  );
}

/** A Puck custom colour field. */
export function colorField(label: string): Field {
  return {
    type: "custom",
    label,
    render: ({ value, onChange }) => <ColorInput value={value as string} onChange={onChange} />,
  };
}

export type BlockStyle = {
  paddingY?: number;
  paddingX?: number;
  background?: string;
  textColor?: string;
  align?: "left" | "center" | "right";
  radius?: number;
  maxWidth?: number;
};

// Shared "Style" field group attached to every block.
export const styleField: Field = {
  type: "object",
  label: "Style",
  objectFields: {
    paddingY: { type: "number", label: "Padding ↕ (px)", min: 0, max: 120 },
    paddingX: { type: "number", label: "Padding ↔ (px)", min: 0, max: 120 },
    background: colorField("Background"),
    textColor: colorField("Text colour"),
    align: {
      type: "radio",
      label: "Align",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    radius: { type: "number", label: "Corner radius (px)", min: 0, max: 48 },
    maxWidth: { type: "number", label: "Max width (px, 0 = full)", min: 0, max: 1200 },
  },
};

export const DEFAULT_STYLE: BlockStyle = { paddingY: 8, paddingX: 0, align: "left", radius: 0, maxWidth: 0 };

export function applyStyle(style?: BlockStyle): CSSProperties {
  const s = style ?? {};
  const centered = s.align === "center" && (s.maxWidth ?? 0) > 0;
  return {
    paddingTop: s.paddingY,
    paddingBottom: s.paddingY,
    paddingLeft: s.paddingX,
    paddingRight: s.paddingX,
    background: s.background || undefined,
    color: s.textColor || undefined,
    textAlign: s.align,
    borderRadius: s.radius || undefined,
    maxWidth: s.maxWidth ? s.maxWidth : undefined,
    marginLeft: centered ? "auto" : undefined,
    marginRight: centered ? "auto" : undefined,
  };
}
