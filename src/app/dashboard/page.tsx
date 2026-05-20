"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCampaigns } from "@/lib/use-campaigns";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const { campaigns, loading } = useCampaigns();
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    fetch("/api/creative-requests")
      .then((r) => r.json())
      .then((data: any[]) => {
        const counts: Record<string, number> = {};
        for (const req of data) {
          if (req.status === "pending_review") counts[req.campaignId] = (counts[req.campaignId] || 0) + 1;
        }
        setPendingCounts(counts);
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  const totalAssetGroups = campaigns.reduce((s, c) => s + c.adGroups.reduce((a, ag) => a + ag.assetGroups.length, 0), 0);
  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate mb-1">Campaigns</h1>
      <p className="text-sm text-slate-light mb-8">
        {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} &middot; {campaigns[0]?.accountName || ""}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Campaigns</div>
          <div className="text-2xl font-bold text-slate">{campaigns.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Asset Groups</div>
          <div className="text-2xl font-bold text-slate">{totalAssetGroups}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-light uppercase tracking-wider mb-1.5">Pending</div>
          <div className="text-2xl font-bold text-slate">{totalPending}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-slate-light text-sm">Loading...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-warm-gray">
                <th className="px-5 py-3 text-xs font-semibold text-slate-light uppercase tracking-wider">Campaign</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-light uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-light uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-light uppercase tracking-wider">Asset Groups</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-light uppercase tracking-wider hidden sm:table-cell">Pending</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => {
                const campaignId = (camp as any).id || camp.campaignName;
                const assetCount = camp.adGroups.reduce((s, ag) => s + ag.assetGroups.length, 0);
                const pc = pendingCounts[camp.campaignName] || 0;
                return (
                  <tr key={campaignId} className="border-b border-gray-50 hover:bg-warm-gray transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate">{camp.campaignName}</div>
                      <div className="text-xs text-slate-light">{camp.accountName} &middot; {camp.domain}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 bg-gray-100 rounded-xl text-xs font-medium text-slate-light">
                        {camp.type === "search" ? "Search" : "Performance Max"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-light text-xs">{assetCount}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {pc > 0 ? (
                        <span className="inline-block px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{pc}</span>
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/campaigns/${encodeURIComponent(campaignId)}`}
                        className="inline-block px-4 py-2 bg-slate text-white rounded-lg text-xs font-semibold hover:bg-slate/90 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
