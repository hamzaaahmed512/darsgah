import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GetDarsgah | School management, made clear",
    template: "%s"
  },
  description: "Darsgah is a connected school management system for students, attendance, academics, finance, staff, and daily operations.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "GetDarsgah | School management, made clear",
    description: "One connected workspace for your whole school.",
    type: "website"
  }
};

import { ScrollToTop } from "@/components/ui/scroll-to-top";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
