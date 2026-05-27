"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const actionStyles = {
  submitted: {
    icon: "P",
    bg: "bg-blue-100",
    color: "text-blue-700",
    label: "submitted",
  },
  done: {
    icon: "✓",
    bg: "bg-green-100",
    color: "text-green-700",
    label: "done",
  },
  changes_needed: {
    icon: "↩",
    bg: "bg-amber-100",
    color: "text-amber-700",
    label: "changes needed",
  },
};

export default function ChangeLogPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace("/");
    fetch("/api/change-log")
      .then((r) => r.json())
      .then((data) => setEntries(data || []))
      .catch(() => {});
  }, [user, router]);

  if (!user) return null;

  const campaignNames = Array.from(
    new Set(entries.map((e: any) => e.campaignName || "").filter(Boolean))
  );

  const filtered =
    filter === "all"
      ? entries
      : entries.filter((e) => e.campaignName === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Change Log</h1>
      <p className="text-sm text-gray-500 mb-6">
        Complete audit trail of all creative changes across all clients.
      </p>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs text-gray-500 font-medium">
          Filter by campaign:
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white"
        >
          <option value="all">All Campaigns</option>
          {campaignNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No entries for this campaign.
          </div>
        ) : (
          filtered.map((entry) => {
            const style = (actionStyles as any)[entry.action] || actionStyles.done;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-100 last:border-b-0"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.bg} ${style.color}`}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">
                    <span className="font-semibold">{entry.actor}</span>{" "}
                    <span className="text-gray-500">({entry.actorEmail})</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {style.label}
                    </span>{" "}
                    Request #{entry.requestId}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Campaign: {entry.campaignName} &middot;{" "}
                    {new Date(entry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {entry.summary}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
