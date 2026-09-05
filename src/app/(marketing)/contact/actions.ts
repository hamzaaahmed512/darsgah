"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";
import { z } from "zod";
import { normalizeEmail } from "@/lib/email";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "school" | "email" | "message", string>>;
};

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100, "Name is too long."),
  school: z.string().trim().min(2, "Enter your school name.").max(150, "School name is too long."),
  email: z.string().trim().transform(normalizeEmail).pipe(z.string().email("Enter a valid email address.").max(254)),
  message: z.string().trim().min(10, "Tell us a little more about what you need.").max(3000, "Message must be 3,000 characters or fewer."),
  website: z.string().max(200)
});

const attempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 4;

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendContactEnquiryAction(_previous: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"), school: formData.get("school"), email: formData.get("email"), message: formData.get("message"),
    website: formData.get("website") ?? ""
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return { status: "error", message: "Please check the highlighted fields.", errors: {
      name: fields.name?.[0], school: fields.school?.[0], email: fields.email?.[0], message: fields.message?.[0]
    } };
  }

  // Honeypot submissions are discarded without telling automated senders.
  if (parsed.data.website) return { status: "success" };

  const requestHeaders = await headers();
  const clientAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (isRateLimited(clientAddress)) return { status: "error", message: "Too many enquiries were sent. Please wait a few minutes and try again." };

  const smtpUser = process.env.CONTACT_EMAIL_USER?.trim();
  const smtpPassword = process.env.CONTACT_EMAIL_APP_PASSWORD?.replace(/\s/g, "");
  const recipient = process.env.CONTACT_EMAIL_TO?.trim() || "darsgah.help@gmail.com";
  if (!smtpUser || !smtpPassword) {
    console.error("Contact form email is not configured. Set CONTACT_EMAIL_USER and CONTACT_EMAIL_APP_PASSWORD.");
    return { status: "error", message: "The enquiry service is temporarily unavailable. Please email darsgah.help@gmail.com directly." };
  }

  const { name, school, email, message } = parsed.data;
  try {
    const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: smtpUser, pass: smtpPassword } });
    await transporter.sendMail({
      from: `Darsgah Website <${smtpUser}>`, to: recipient, replyTo: email,
      subject: `Demo enquiry from ${school.replace(/[\r\n]/g, " ")}`,
      text: `Name: ${name}\nSchool: ${school}\nEmail: ${email}\n\n${message}`,
      html: `<h2>New Darsgah demo enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>School:</strong> ${escapeHtml(school)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong></p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`
    });
    return { status: "success" };
  } catch (error) {
    console.error("Contact enquiry email failed:", error);
    return { status: "error", message: "We could not send your enquiry right now. Please try again or email darsgah.help@gmail.com directly." };
  }
}
