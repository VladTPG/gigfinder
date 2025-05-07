"use client";

import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen w-full pb-16 flex justify-center items-center">
        {children}
      </div>
      <MobileNavigation />
    </>
  );
}
