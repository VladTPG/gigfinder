"use client";

import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  UserIcon,
  LogOutIcon,
  SearchIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context-fix";
import SignOutButton from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "FEED", icon: HomeIcon },
  { href: "/bands", label: "BANDS", icon: UsersIcon },
  { href: "/gigs", label: "GIGS", icon: CalendarIcon },
  { href: "/search", label: "SEARCH", icon: SearchIcon },
  { href: "/profile", label: "PROFILE", icon: UserIcon },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

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

        {user && (
          <SignOutButton
            className={cn(
              "flex flex-col items-center justify-center w-full py-2 transition-all duration-300",
              "text-muted-foreground hover:text-[color:var(--accent)] hover:[text-shadow:_0_0_5px_var(--accent)] hover:[&>svg]:drop-shadow-[0_0_5px_var(--accent)]"
            )}
          >
            <LogOutIcon size={20} />
            <span className="text-xs mt-1 tracking-widest">SIGN OUT</span>
          </SignOutButton>
        )}
      </nav>
    </div>
  );
}
