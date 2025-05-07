"use client";

import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  UserIcon,
  LogOutIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import SignOutButton from "@/components/auth/sign-out-button";

import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "FEED", icon: HomeIcon },
  { href: "/bands", label: "BANDS", icon: UsersIcon },
  { href: "/gigs", label: "GIGS", icon: CalendarIcon },
  { href: "/profile", label: "PROFILE", icon: UserIcon },
];

export function DesktopNavigation() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const { user } = useAuth();

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

        {user && (
          <>
            <Separator className="my-2 bg-border/40 mx-auto w-5/6" />
            <div className="relative">
              <div className="flex items-center px-3 py-5 rounded-xl transition-all duration-300 relative overflow-hidden text-muted-foreground hover:text-accent hover:bg-accent/10">
                <SignOutButton className="flex items-center gap-4 w-full">
                  <div className="transition-all duration-300">
                    <LogOutIcon size={25} />
                  </div>
                  <span className="text-lg transition-all duration-300 tracking-widest">
                    SIGN OUT
                  </span>
                </SignOutButton>
              </div>
            </div>
          </>
        )}
      </SidebarMenu>
    </Sidebar>
  );
}
