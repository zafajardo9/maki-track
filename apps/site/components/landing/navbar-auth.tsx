"use client";

import { LayoutDashboard, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import {
  MAKI_API_URL,
  MAKI_DASHBOARD_URL,
  MAKI_SIGN_IN_URL,
  MAKI_SIGN_UP_URL,
} from "@/lib/maki-app-url";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const SESSION_URL = `${MAKI_API_URL}/api/auth/get-session`;
const SIGN_OUT_URL = `${MAKI_API_URL}/api/auth/sign-out`;

// Session avatars are API-relative (`/api/user/avatar/<id>`), so they resolve
// against the API origin rather than whichever origin serves the site.
function resolveAvatarSrc(image: string | null | undefined) {
  if (!image) return "";
  return image.startsWith("/") ? `${MAKI_API_URL}${image}` : image;
}

/**
 * Sign-in calls to action that become the signed-in user's menu.
 *
 * The site is a static export, so the session is resolved in the browser. When
 * the site is hosted on a different origin than the app, the session cookie is
 * not sent and the API rejects the request; the buttons are the fallback, which
 * keeps the navbar correct for anonymous visitors in every deployment shape.
 */
export function NavbarAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(SESSION_URL, { credentials: "include" });
        if (!response.ok) return;

        const data = (await response.json()) as { user?: SessionUser } | null;
        if (!cancelled) {
          setUser(data?.user ?? null);
        }
      } catch {
        // Keep the signed-out buttons when the session can't be read.
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return (
      <>
        <Button
          className="text-sm"
          render={<a href={MAKI_SIGN_IN_URL} />}
          size="sm"
          variant="ghost"
        >
          Sign In
        </Button>
        <Button
          className="text-sm"
          render={<a href={MAKI_SIGN_UP_URL} />}
          size="sm"
        >
          Get Started
        </Button>
      </>
    );
  }

  const label = user.name || user.email || "Account";

  async function handleSignOut() {
    try {
      await fetch(SIGN_OUT_URL, { method: "POST", credentials: "include" });
    } catch {
      // Reloading re-checks the session, so a failed request self-corrects.
    }
    setUser(null);
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="gap-2 text-sm" size="sm" variant="ghost" />}
      >
        <Avatar className="size-6">
          <AvatarImage alt={label} src={resolveAvatarSrc(user.image)} />
          <AvatarFallback className="text-[10px] font-medium">
            {label.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {user.email || label}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href={MAKI_DASHBOARD_URL} />}>
            <LayoutDashboard />
            Open Maki
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NavbarAuth;
