import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PR System",
  description: "Purchase Request creation, approval, and tracking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
