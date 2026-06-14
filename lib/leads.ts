import { Resend } from "resend";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notificationEmail, resendApiKey } from "@/lib/env";

export const leadSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  agency: z.string().trim().max(160).optional().or(z.literal("")),
  intent: z.enum(["waitlist", "partner", "trial", "sales"]).default("waitlist"),
  plan: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(1200).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export async function captureLead(input: LeadInput) {
  const lead = leadSchema.parse(input);
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Database is not configured");
  }

  const { error } = await supabase.from("leads").insert({
    email: lead.email,
    name: lead.name || null,
    agency: lead.agency || null,
    intent: lead.intent,
    plan: lead.plan || null,
    message: lead.message || null,
  });

  if (error) {
    console.error("Failed to store lead", error);
    throw new Error("Could not save lead");
  }

  if (resendApiKey && notificationEmail) {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Kōrero <onboarding@resend.dev>",
      to: notificationEmail,
      subject: `New Kōrero ${lead.intent} lead`,
      text: [
        `Email: ${lead.email}`,
        `Name: ${lead.name || "-"}`,
        `Agency: ${lead.agency || "-"}`,
        `Plan: ${lead.plan || "-"}`,
        "",
        lead.message || "",
      ].join("\n"),
    });
  }

  return { ok: true };
}
