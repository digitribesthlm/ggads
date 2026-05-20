"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
export default function ClientsPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace("/");
    if (user && !isAccountManager) router.replace("/dashboard");
    fetch("/api/creative-requests")
      .then((r) => r.json())
      .then((data) => setAllRequests(data || []))
      .catch(() => {});
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setClients((data.users || []).filter((u: any) => u.role === "client")))
      .catch(() => {});
  }, [user, isAccountManager, router]);

  if (!user || !isAccountManager) return null;

  const getInviteLink = (email: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/?invite=${encodeURIComponent(email)}`;
  };

  const getEmailTemplate = (email: string, name: string) => {
    const link = getInviteLink(email);
    return `Subject: Your AdsPortal access — ${email}

Hi ${name},

You now have access to AdsPortal, where you can review and request changes to your Google Ads campaigns.

Click here to sign in (no password needed):
${link}

This link is unique to you — please do not share it.

Best,
Alice
Account Manager`;
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getClientRequests = (clientId: string) =>
    allRequests.filter((r) => r.clientId === clientId);

  const formatDate = (iso?: string) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const timeAgo = (iso?: string) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Clients</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage client access and track who has logged in.
      </p>

      <div className="space-y-3">
        {clients.map((client) => {
          const requests = getClientRequests(client.clientId ?? "");
          const hasLoggedIn = client.loginCount > 0;
          const pendingCount = requests.filter(
            (r) => r.status === "pending_review"
          ).length;
          const totalRequests = requests.length;

          return (
            <div
              key={client.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Summary row */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        hasLoggedIn
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {client.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {client.name}
                        {client.company && (
                          <span className="text-gray-400 font-normal ml-1">
                            — {client.company}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {client.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Status indicators */}
                    <div className="hidden sm:flex items-center gap-4 text-xs">
                      {/* Invite status */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            client.inviteSentAt
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span className="text-gray-500">
                          {client.inviteSentAt
                            ? `Invite sent ${timeAgo(client.inviteSentAt)}`
                            : "Not invited"}
                        </span>
                      </div>

                      {/* Login status */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasLoggedIn ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="text-gray-500">
                          {hasLoggedIn
                            ? `Last login ${timeAgo(client.lastLoginAt)}`
                            : "Never logged in"}
                        </span>
                      </div>

                      {/* Activity */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">
                          {totalRequests > 0
                            ? `${totalRequests} request${totalRequests > 1 ? "s" : ""}${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}`
                            : "No activity"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          expanded === client.email ? null : client.email
                        )
                      }
                      className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-hover transition-colors"
                    >
                      {expanded === client.email ? "Close" : "Invite"}
                    </button>
                  </div>
                </div>

                {/* Mobile status — visible below sm */}
                <div className="sm:hidden mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        client.inviteSentAt ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-gray-500">
                      {client.inviteSentAt ? "Invite sent" : "Not invited"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasLoggedIn ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-gray-500">
                      {hasLoggedIn
                        ? `Logged in ${timeAgo(client.lastLoginAt)}`
                        : "Never logged in"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded: invite panel */}
              {expanded === client.email && (
                <div className="border-t border-gray-200 bg-gray-50 p-5 space-y-4">
                  {/* Invite Link */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Invite Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getInviteLink(client.email)}
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 font-mono"
                      />
                      <button
                        onClick={() =>
                          handleCopy(
                            getInviteLink(client.email),
                            `link-${client.id}`
                          )
                        }
                        className="px-4 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-white transition-colors whitespace-nowrap"
                      >
                        {copied === `link-${client.id}`
                          ? "Copied!"
                          : "Copy Link"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {client.name} clicks this link and is signed in — no
                      password needed. The link is unique to their email.
                    </p>
                  </div>

                  {/* Email Template */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700">
                        Pre-written Email
                      </label>
                      <button
                        onClick={() =>
                          handleCopy(
                            getEmailTemplate(client.email, client.name),
                            `email-${client.id}`
                          )
                        }
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {copied === `email-${client.id}`
                          ? "Copied!"
                          : "Copy Email"}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap font-mono">
                      {getEmailTemplate(client.email, client.name)}
                    </pre>
                  </div>

                  {/* Login Activity */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">
                      Activity Tracker
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Invite Sent
                        </div>
                        <div className="text-xs text-gray-900 font-medium">
                          {formatDate(client.inviteSentAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Last Login
                        </div>
                        <div className="text-xs text-gray-900 font-medium">
                          {formatDate(client.lastLoginAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                          Total Logins
                        </div>
                        <div className="text-xs text-gray-900 font-medium">
                          {client.loginCount}
                        </div>
                      </div>
                    </div>

                    {requests.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                          Requests Submitted
                        </div>
                        <div className="space-y-1">
                          {requests.map((req) => (
                            <div
                              key={req._id || req.id}
                              className="text-xs text-gray-600 flex items-center gap-2"
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  req.status === "pending_review"
                                    ? "bg-orange-400"
                                    : req.status === "approved"
                                      ? "bg-green-400"
                                      : "bg-red-400"
                                }`}
                              />
                              Request #{req.id} —{" "}
                              {req.status === "pending_review"
                                ? "Pending"
                                : req.status === "approved"
                                  ? "Done"
                                  : "Changes Needed"}
                              <span className="text-gray-400">
                                {formatDate(req.submittedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {requests.length === 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                        No requests submitted yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
