"use server";

import { headers } from "next/headers";
import { submitContact } from "@/lib/contact";
import { issueFormToken } from "@/lib/security/form-token";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import type { ContactFormState } from "@/lib/types";

const field = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** Server Action bound to the contact form through `useActionState`. Next.js enforces same-origin for actions. */
export async function sendContact(_prev: ContactFormState, form: FormData): Promise<ContactFormState> {
  const h = await headers();
  const result = await submitContact({
    fields: { name: field(form, "name"), email: field(form, "email"), company: field(form, "company"), message: field(form, "message") },
    website: field(form, "website"),
    formToken: field(form, "formToken"),
    turnstileToken: field(form, "cf-turnstile-response"),
    ip: clientIp(h),
  });
  return { status: "done", ...result };
}

/** Issues the first HMAC form token when the form mounts. */
export async function getFormToken(): Promise<string | null> {
  const limit = await rateLimit("contact", clientIp(await headers()));
  return limit.success ? issueFormToken() : null;
}
