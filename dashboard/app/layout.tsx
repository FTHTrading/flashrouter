import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "FlashRouter Dashboard",
  description: "Monitor and manage your flash-loan activity",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
