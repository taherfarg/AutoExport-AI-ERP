import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoSphere ERP",
  description: "AutoSphere ERP operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
