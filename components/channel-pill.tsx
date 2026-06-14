import { cn } from "@/lib/utils";
import { channels, type ChannelKey } from "@/lib/catalog";

export function ChannelPill({ channel, className }: { channel: ChannelKey; className?: string }) {
  const c = channels[channel];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
      {c.short}
    </span>
  );
}
