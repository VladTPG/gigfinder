import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Navigation } from "@/components/ui/navigation";

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
        <SidebarProvider>
          <Navigation />
          <div className="min-h-screen">{children}</div>
        </SidebarProvider>
      </body>
    </html>
  );
}
