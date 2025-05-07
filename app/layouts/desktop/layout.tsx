"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { DesktopNavigation } from "@/components/ui/desktop-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export function DesktopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <SidebarProvider>
      <DesktopNavigation />
      <div className="w-full flex justify-center">{children}</div>
    </SidebarProvider>
  );
}
