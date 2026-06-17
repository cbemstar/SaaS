"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { InviteRole, PendingInvite, TeamMember, WorkspaceRole } from "@/lib/team";

type TeamPanelProps = {
  members: TeamMember[];
  invites: PendingInvite[];
  currentUser: {
    id: string;
    email: string | null;
    role: WorkspaceRole;
    canManageTeam: boolean;
  };
};

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const roleVariants: Record<WorkspaceRole, "default" | "soft" | "muted"> = {
  owner: "default",
  admin: "soft",
  member: "muted",
};

export function TeamPanel({ members, invites, currentUser }: TeamPanelProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviting(true);
    setInviteUrl(null);

    const response = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      inviteUrl?: string;
      emailed?: boolean;
    };

    setInviting(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not send invite");
      return;
    }

    const invited = email;
    setEmail("");
    setInviteUrl(payload.inviteUrl ?? null);
    if (payload.emailed) toast.success(`Invitation sent to ${invited}`);
    else toast.info("Invite created — copy the link below (email delivery isn't configured)");
    router.refresh();
  }

  async function handleRevokeInvite(invite: PendingInvite) {
    const ok = await confirm({
      title: "Revoke this invite?",
      description: `${invite.email} will no longer be able to join with this link.`,
      confirmText: "Revoke invite",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(invite.id);
    const response = await fetch(`/api/team/invites/${invite.id}`, { method: "DELETE" });
    setBusyId(null);
    if (response.ok) {
      toast.success("Invite revoked");
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Could not revoke invite");
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    const ok = await confirm({
      title: "Remove team member?",
      description: `${member.email ?? "This member"} will lose access to this workspace.`,
      confirmText: "Remove member",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(member.userId);
    const response = await fetch(`/api/team/members/${member.userId}`, { method: "DELETE" });
    setBusyId(null);
    if (response.ok) {
      toast.success("Team member removed");
      router.refresh();
    } else {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Could not remove team member");
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  }

  return (
    <div className="space-y-6">
      {currentUser.canManageTeam && (
        <form onSubmit={(event) => void handleInvite(event)} className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite teammate
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@agency.co.nz"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting} className="gap-1.5">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Admins can invite and manage teammates. Members can use the app but cannot change team settings.
          </p>
        </form>
      )}

      {inviteUrl && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="truncate font-mono text-muted-foreground">{inviteUrl}</span>
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void copyInviteUrl()}>
            <Copy className="h-3.5 w-3.5" /> Copy link
          </Button>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Team members</h3>
        <div className="overflow-hidden rounded-xl border">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{member.email ?? "Unknown user"}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(member.joinedAt).toLocaleDateString("en-NZ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={roleVariants[member.role]}>{roleLabels[member.role]}</Badge>
                {currentUser.canManageTeam && member.role !== "owner" && member.userId !== currentUser.id && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={busyId === member.userId}
                    onClick={() => void handleRemoveMember(member)}
                    aria-label={`Remove ${member.email ?? "member"}`}
                  >
                    {busyId === member.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentUser.canManageTeam && invites.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Pending invites</h3>
          <div className="overflow-hidden rounded-xl border">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString("en-NZ")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === invite.id}
                  onClick={() => void handleRevokeInvite(invite)}
                >
                  {busyId === invite.id ? "Revoking…" : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
