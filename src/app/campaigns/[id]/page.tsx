"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ImportedCampaign, ImportedAssetGroup } from "@/lib/types";

export default function CampaignDetailPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = decodeURIComponent(params.id as string);

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = () => {
    fetch(`/api/campaigns/${user?.domain || ".se"}`)
      .then((r) => r.json())
      .then((data) => {
        const found = (data.campaigns || []).find(
          (c: any) => (c.id || c.campaignName) === campaignId
        );
        setCampaign(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    fetchCampaign();
  }, [user, campaignId]);

  // Re-fetch when user navigates back (bfcache restores stale page)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) fetchCampaign();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [campaignId]);

  if (!user) return null;
  if (loading) return <div className="p-12 text-center text-slate-light text-sm">Loading...</div>;
  if (!campaign) return (
    <div className="p-12 text-center">
      <p className="text-slate-light text-sm mb-4">Campaign not found.</p>
      <Link href="/dashboard" className="text-brand text-sm hover:underline">Back to campaigns</Link>
    </div>
  );

  const allAssetGroups: { agName: string; asset: ImportedAssetGroup }[] = [];
  for (const ag of campaign.adGroups) {
    for (const asg of ag.assetGroups) {
      allAssetGroups.push({ agName: ag.name, asset: asg });
    }
  }

  const totalHeadlines = allAssetGroups.reduce((s, a) => s + a.asset.headlines.length, 0);
  const totalDescriptions = allAssetGroups.reduce((s, a) => s + a.asset.descriptions.length, 0);
  const isPMax = campaign.type === "pmax";

  return (
    <div>
      <Link href="/dashboard" className="text-[13px] text-slate-light hover:text-slate mb-8 inline-block">&larr; Campaigns</Link>

      {/* Hero — exact match variant-detail-B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12 items-center">
        <div>
          <h1 className="text-[32px] font-bold text-slate leading-tight mb-3">{campaign.campaignName}</h1>
          <p className="text-[15px] text-slate-light mb-6 leading-relaxed">
            {isPMax
              ? `Performance Max campaign with ${allAssetGroups.length} asset groups.`
              : `Search campaign with ${campaign.adGroups.length} ad group${campaign.adGroups.length !== 1 ? "s" : ""}.`}
          </p>
          {isPMax && (
            <div className="flex gap-8">
              <div>
                <div className="text-[36px] font-bold text-slate">{allAssetGroups.length}</div>
                <div className="text-xs text-slate-light uppercase tracking-wider font-semibold mt-1">Asset Groups</div>
              </div>
              <div>
                <div className="text-[36px] font-bold text-slate">{totalHeadlines}</div>
                <div className="text-xs text-slate-light uppercase tracking-wider font-semibold mt-1">Headlines</div>
              </div>
              <div>
                <div className="text-[36px] font-bold text-slate">{totalDescriptions}</div>
                <div className="text-xs text-slate-light uppercase tracking-wider font-semibold mt-1">Descriptions</div>
              </div>
            </div>
          )}
        </div>
        <div className="hidden lg:flex aspect-[4/3] bg-gradient-to-br from-brand-light to-warm-gray rounded-[20px] items-center justify-center">
          <span className="text-5xl text-brand/30">&#x1F4CA;</span>
        </div>
      </div>

      {/* Search campaign */}
      {!isPMax && (
        <div className="space-y-4">
          {campaign.adGroups.map((ag: any) => (
            <div key={ag.name} className="bg-white border border-gray-200 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate">{ag.name}</h2>
                  <p className="text-sm text-slate-light mt-1">Ad Group</p>
                </div>
              </div>
              <Link
                href={`/campaigns/${encodeURIComponent((ag.assetGroups[0] as any)?.id || `${campaign.campaignName}__${ag.assetGroups[0]?.name || ag.name}`)}/request`}
                className="inline-flex px-5 py-2.5 bg-slate text-white rounded-xl text-sm font-semibold hover:bg-slate/90 transition-colors"
              >
                Edit Creative
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* PMAX card grid — exact match variant-detail-B */}
      {isPMax && allAssetGroups.length > 0 && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {allAssetGroups.map(({ asset }) => {
            const assetId = (asset as any).id || `${campaign.campaignName}__${asset.name}`;
            const hasImage = ((asset as any).assignedImages || []).length > 0;
            const firstImage = hasImage ? ((asset as any).assignedImages[0]?.url || (asset as any).assignedImages[0]?.asset_url) : null;
            const hasPending = !!(asset as any)._pendingRequest;
            const changedHL = (asset as any)._changedHeadlineIndices || [];
            const changedDesc = (asset as any)._changedDescriptionIndices || [];
            const changedUrl = (asset as any)._changedUrl;

            return (
              <div key={assetId} className={`rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all ${hasPending ? "bg-orange-50/30 ring-1 ring-orange-200" : "bg-warm-gray"}`}>
                {/* card-top */}
                <div className="px-5 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate tracking-tight">{asset.name}</h3>
                    {hasPending && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-semibold shrink-0">Pending</span>
                    )}
                  </div>
                </div>

                {/* card-visual */}
                <div className="px-5 pt-4 pb-4">
                  <div className="aspect-[16/9] bg-white rounded-[10px] flex items-center justify-center">
                    {hasImage ? (
                      <img src={firstImage} alt={asset.name} className="w-full h-full object-cover rounded-[10px]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-3xl text-slate-light/20">&#x1F4F7;</span>
                    )}
                  </div>
                </div>

                {/* card-body */}
                <div className="px-5 pb-5">
                  <p className="text-[11px] text-slate-light mb-3">
                    {asset.headlines?.length || 0} headlines &middot; {asset.longHeadlines?.length || 0} long &middot; {asset.descriptions?.length || 0} descriptions
                    {hasPending && changedHL.length > 0 ? <> &middot; <span className="text-orange-600 font-medium">{changedHL.length} changed</span></> : ""}
                    {asset.adStrength ? <> &middot; {asset.adStrength}</> : ""}
                    {asset.callToAction ? <> &middot; {asset.callToAction}</> : ""}
                  </p>

                  {asset.finalUrl && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-light mb-4">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${changedUrl ? "bg-orange-400" : hasPending ? "bg-orange-400" : "bg-brand"}`} />
                      <span className="truncate">{asset.finalUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/campaigns/${encodeURIComponent(assetId)}/request`}
                      className={`flex-1 text-center py-2.5 rounded-[10px] text-xs font-semibold transition-colors ${
                        hasPending
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          : "bg-slate text-white hover:bg-slate/90"
                      }`}
                    >
                      {hasPending ? "Pending" : "Edit"}
                    </Link>
                    {asset.finalUrl && (
                      <a href={asset.finalUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center py-2.5 border border-gray-200 text-slate-light rounded-[10px] text-xs font-semibold hover:bg-white transition-colors">
                        Preview
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
