"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <DropdownMenuItem onClick={() => void signOut(() => router.push("/login"))}>
      Sign out
    </DropdownMenuItem>
  );
}
