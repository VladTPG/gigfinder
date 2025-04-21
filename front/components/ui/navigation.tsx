"use client";

import { HomeIcon, UsersIcon, CalendarIcon, UserIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "HOME", icon: HomeIcon },
  { href: "/bands", label: "BANDS", icon: UsersIcon },
  { href: "/gigs", label: "GIGS", icon: CalendarIcon },
  { href: "/profile", label: "PROFILE", icon: UserIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState<string | null>(null);

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 w-full bg-sidebar rounded-t-xl shadow-lg border-t border-border/30">
        <nav className="flex h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center w-full py-2 transition-all duration-300",
                  isActive
                    ? "text-[color:var(--accent)] [text-shadow:_0_0_5px_var(--accent)] [&>svg]:drop-shadow-[0_0_5px_var(--accent)]"
                    : "text-muted-foreground hover:text-[color:var(--accent)] hover:[text-shadow:_0_0_5px_var(--accent)] hover:[&>svg]:drop-shadow-[0_0_5px_var(--accent)]"
                )}
              >
                <Icon size={20} />
                <span className="text-xs mt-1 tracking-widest">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <Sidebar className="p-4 flex flex-col gap-6">
      <img src="/logo.png" className="mb-14 mt-5 w-fit" alt="logo" />

      <SidebarMenu className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }, index) => {
          const isActive = pathname === href;
          const isHovered = hovered === href;

          return (
            <div key={href} className="relative">
              <SidebarMenuButton
                asChild
                isActive={isActive}
                onMouseEnter={() => setHovered(href)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "flex items-center px-3 py-5 rounded-xl transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "text-accent font-medium [text-shadow:_0_0_4px_var(--accent)]"
                    : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                )}
              >
                <Link href={href} className="flex items-center gap-4 w-full">
                  <div
                    className={cn(
                      "transition-all duration-300",
                      isActive || isHovered
                        ? "text-accent [filter:drop-shadow(0_0_3px_var(--accent))]"
                        : ""
                    )}
                  >
                    <Icon size={25} />
                  </div>
                  <span
                    className={cn(
                      "text-lg transition-all duration-300 tracking-widest",
                      isActive ? "font-medium" : "font-normal"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </SidebarMenuButton>

              {index < navItems.length - 1 && (
                <Separator className="my-2 bg-border/40 mx-auto w-5/6" />
              )}
            </div>
          );
        })}
      </SidebarMenu>
    </Sidebar>
  );
}
