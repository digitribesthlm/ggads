"use client";

import { useAuth } from "@/components/AuthProvider";
import { Sidebar } from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const { user, isAccountManager, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-gray">
        <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (pathname === "/" || !user) {
    return <>{children}</>;
  }

  // Redirect non-account-managers away from account-manager pages
  if (!isAccountManager && (pathname.startsWith("/review") || pathname.startsWith("/clients"))) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-warm-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs text-slate-light">{user.email}</span>
              <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold">
                {user.name[0]}
              </div>
            </div>
            <button
              onClick={async () => { await logout(); router.push("/"); }}
              className="text-xs text-slate-light hover:text-red-600 transition-colors ml-2"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
