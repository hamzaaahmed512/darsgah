import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required.");

export const metadata: Metadata = {
  title: {
    default: "GetDarsgah | School management, made clear",
    template: "%s"
  },
  description: "Darsgah is a connected school management system for students, attendance, academics, finance, staff, and daily operations.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "GetDarsgah | School management, made clear",
    description: "One connected workspace for your whole school.",
    type: "website"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await headers(); // Nonce-based CSP requires request-time rendering.
  return (
    <html lang="en">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
