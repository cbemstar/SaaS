"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import type { Field } from "@measured/puck";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Heading1,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_OPTIONS } from "@/components/report-builder/fields";

const SIZES = ["", "14px", "16px", "18px", "20px", "24px", "30px", "36px"];

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-muted/30 p-1">
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const href = window.prompt("Link URL", prev ?? "https://");
          if (href === null) return;
          if (href === "") editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href }).run();
        }}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Btn>

      <select
        aria-label="Font"
        className="h-7 rounded border border-border bg-background px-1 text-xs"
        value={(editor.getAttributes("textStyle").fontFamily as string) ?? ""}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontFamily(e.target.value).run()
            : editor.chain().focus().unsetFontFamily().run()
        }
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Font size"
        className="h-7 rounded border border-border bg-background px-1 text-xs"
        value={(editor.getAttributes("textStyle").fontSize as string) ?? ""}
        onChange={(e) =>
          e.target.value
            ? editor.chain().focus().setFontSize(e.target.value).run()
            : editor.chain().focus().unsetFontSize().run()
        }
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s || "Size"}
          </option>
        ))}
      </select>

      <input
        type="color"
        aria-label="Text colour"
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
        value={(editor.getAttributes("textStyle").color as string) ?? "#111111"}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
      />
    </div>
  );
}

function RichTextEditor({ value, onChange }: { value?: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      FontFamily,
      Color,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <Toolbar editor={editor} />
      <div className="rounded-md border border-border bg-background p-3">
        <EditorContent editor={editor} className="rb-prose text-sm focus:outline-none" />
      </div>
    </div>
  );
}

export function richTextField(): Field<string> {
  return {
    type: "custom",
    label: "Content",
    render: ({ value, onChange }) => <RichTextEditor value={value} onChange={onChange} />,
  };
}
