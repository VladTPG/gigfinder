import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/auth-context-fix";

export const metadata: Metadata = {
  title: "GigFinder",
  description: "GigFinder application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
