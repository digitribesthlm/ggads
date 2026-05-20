"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const { user, isAccountManager, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const clientLinks = [
    { href: "/dashboard", label: "Campaigns" },
    { href: "/my-requests", label: "My Requests" },
    { href: "/changelog", label: "Change Log" },
  ];

  const amLinks = [
    { href: "/dashboard", label: "Campaigns" },
    { href: "/review", label: "Pending Changes" },
    { href: "/clients", label: "Clients" },
    { href: "/changelog", label: "Change Log" },
  ];

  const links = isAccountManager ? amLinks : clientLinks;

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate tracking-tight">
              Portal
            </div>
            <div className="text-[11px] text-slate-light">
              {isAccountManager ? "Account Manager" : "Client Portal"}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href === "/dashboard" && pathname === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block mx-2 px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 ${
                isActive
                  ? "bg-brand-light text-brand font-semibold"
                  : "text-slate-light hover:text-slate hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <div className="text-xs text-slate-light mb-2">{user.email}</div>
        <button
          onClick={logout}
          className="text-xs text-slate-light hover:text-brand transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
