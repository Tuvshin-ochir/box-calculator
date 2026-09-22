import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Box Operations",
  description: "Create, validate, and manage profitable loot boxes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
