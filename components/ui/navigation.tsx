"use client";

import { HomeIcon, UsersIcon, CalendarIcon, UserIcon, Bell, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context-fix";
import { UserRole } from "@/lib/types";
import { subscribeToTotalUnreadCount } from "@/lib/firebase/messages";

import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { userProfile } = useAuth();

  // Subscribe to unread message count
  useEffect(() => {
    if (!userProfile) return;

    const userType = userProfile.role === "manager" ? "venue_manager" : "artist";
    const unsubscribe = subscribeToTotalUnreadCount(
      userProfile.id,
      userType,
      setUnreadMessageCount
    );

    return () => unsubscribe();
  }, [userProfile]);

  // Dynamic navigation items based on user role
  const getNavItems = () => {
    const profileHref =
      userProfile?.role === UserRole.MANAGER ? "/venue-profile" : "/profile";
    return [
      { href: "/", label: "HOME", icon: HomeIcon },
      { href: "/bands", label: "BANDS", icon: UsersIcon },
      { href: "/notifications", label: "NOTIFICATIONS", icon: Bell },
      { href: "/gigs", label: "GIGS", icon: CalendarIcon },
      { href: "/messages", label: "MESSAGES", icon: MessageCircle, badge: unreadMessageCount },
      { href: profileHref, label: "PROFILE", icon: UserIcon },
    ];
  };

  const navItems = getNavItems();

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 w-full bg-sidebar rounded-t-xl shadow-lg border-t border-border/30">
        <nav className="flex h-16">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center w-full py-2 transition-all duration-300 relative",
                  isActive
                    ? "text-[color:var(--accent)] [text-shadow:_0_0_5px_var(--accent)] [&>svg]:drop-shadow-[0_0_5px_var(--accent)]"
                    : "text-muted-foreground hover:text-[color:var(--accent)] hover:[text-shadow:_0_0_5px_var(--accent)] hover:[&>svg]:drop-shadow-[0_0_5px_var(--accent)]"
                )}
              >
                <div className="relative">
                  <Icon size={20} />
                  {badge && badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
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
        {navItems.map(({ href, label, icon: Icon, badge }, index) => {
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
                      "transition-all duration-300 relative",
                      isActive || isHovered
                        ? "text-accent [filter:drop-shadow(0_0_3px_var(--accent))]"
                        : ""
                    )}
                  >
                    <Icon size={25} />
                    {badge && badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
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
