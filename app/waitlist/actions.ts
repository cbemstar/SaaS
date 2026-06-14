"use server";

import { redirect } from "next/navigation";
import { captureLead } from "@/lib/leads";

export async function joinWaitlist(formData: FormData) {
  const intent = String(formData.get("intent") || "waitlist");
  await captureLead({
    email: String(formData.get("email") || ""),
    name: String(formData.get("name") || ""),
    agency: String(formData.get("agency") || ""),
    intent: intent === "partner" || intent === "trial" || intent === "sales" ? intent : "waitlist",
    plan: String(formData.get("plan") || ""),
    message: String(formData.get("message") || ""),
  });

  redirect(`/waitlist?submitted=1&intent=${encodeURIComponent(intent)}`);
}
