"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCampaigns } from "@/lib/use-campaigns";
import type { CreativeRequest } from "@/lib/types";
import Link from "next/link";

const CATEGORY_COLORS: Record<string, string> = {
  hero: "bg-purple-100 text-purple-800",
  product: "bg-blue-100 text-blue-800",
  "case-study": "bg-green-100 text-green-800",
  person: "bg-pink-100 text-pink-800",
  logo: "bg-yellow-100 text-yellow-800",
  "partner-logo": "bg-amber-100 text-amber-800",
  icon: "bg-cyan-100 text-cyan-800",
  illustration: "bg-indigo-100 text-indigo-800",
  screenshot: "bg-gray-100 text-gray-800",
  background: "bg-orange-100 text-orange-800",
  unknown: "bg-gray-100 text-gray-500",
};

function ImageCard({ image, index, variant }: { image: any; index: number; variant: "old" | "new" | "default" }) {
  const borderColor = variant === "old" ? "border-orange-200" : variant === "new" ? "border-green-400" : "border-gray-200";
  return (
    <div className={`mb-3 rounded-xl border-2 ${borderColor} overflow-hidden bg-white`}>
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        <img
          src={image.url}
          alt={image.filename || `Image ${index + 1}`}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-900 truncate">
            {image.filename || `Image ${index + 1}`}
          </span>
          {image.category && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${CATEGORY_COLORS[image.category] || CATEGORY_COLORS.unknown}`}>
              {image.category}
            </span>
          )}
        </div>
        {(image.width > 0 && image.height > 0) && (
          <p className="text-[10px] text-gray-400">
            {image.width} × {image.height}px
          </p>
        )}
        {image.sourcePage && (
          <p className="text-[10px] text-gray-400 truncate" title={image.sourcePage}>
            From: {new URL(image.sourcePage).hostname}{new URL(image.sourcePage).pathname}
          </p>
        )}
        <p className="text-[10px] text-gray-300 truncate" title={image.url}>
          {image.url.split("/").pop()?.split("?")[0] || image.url}
        </p>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const { campaigns } = useCampaigns();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  useEffect(() => {
    if (!user) router.replace("/");
    if (user && !isAccountManager) router.replace("/dashboard");
    fetch("/api/creative-requests")
      .then((r) => r.json())
      .then((data) => setRequests(data))
      .catch(() => {});
  }, [user, isAccountManager, router]);

  if (!user || !isAccountManager) return null;

  const pending = requests.filter((r) => r.status === "pending_review");
  const processed = requests.filter((r) => r.status === "approved" || r.status === "rejected");

  const getCampaignName = (reqId: string) => {
    for (const c of campaigns) {
      for (const ag of (c as any).adGroups || []) {
        for (const asg of ag.assetGroups || []) {
          const asgId = asg.id || `${c.campaignName}__${asg.name}`;
          if (asgId === reqId) return `${c.campaignName} — ${asg.name}`;
        }
      }
    }
    return "Unknown";
  };

  // If a specific request is selected, show the review view
  if (selectedReq) {
    // Find the asset group across all campaigns
    let campaign: any = null;
    let assetGroup: any = null;
    for (const c of campaigns) {
      for (const ag of (c as any).adGroups || []) {
        for (const asg of ag.assetGroups || []) {
          const asgId = asg.id || `${c.campaignName}__${asg.name}`;
          if (asgId === selectedReq.campaignId) {
            campaign = c;
            assetGroup = asg;
          }
        }
      }
    }
    if (!assetGroup) {
      return (
        <div className="p-12 text-center">
          <p className="text-slate-light text-sm mb-4">Asset group not found for this request.</p>
          <button onClick={() => setSelectedReq(null)} className="text-brand text-sm hover:underline">Back to requests</button>
        </div>
      );
    }

    const displayName = `${(campaign as any).campaignName || campaign?.name} — ${assetGroup.name}`;
    const displayType = (campaign as any).type || "pmax";

    // Build ID→value maps from live asset group
    const liveHlById = new Map<string, string>();
    ((assetGroup.headlineIds || []) as string[]).forEach((id: string, i: number) => {
      liveHlById.set(id, ((assetGroup.headlines || []) as string[])[i] || "");
    });
    const liveDescById = new Map<string, string>();
    ((assetGroup.descriptionIds || []) as string[]).forEach((id: string, i: number) => {
      liveDescById.set(id, ((assetGroup.descriptions || []) as string[])[i] || "");
    });

    // Compare request vs live by ID
    const reqHlIds: string[] = selectedReq.headlineIds || [];
    const reqHlTexts: string[] = selectedReq.headlines || [];
    const reqDescIds: string[] = selectedReq.descriptionIds || [];
    const reqDescTexts: string[] = selectedReq.descriptions || [];

    // Changed: ID in both, text differs
    const changedHeadlines: { id: string; oldText: string; newText: string }[] = [];
    for (let i = 0; i < reqHlIds.length; i++) {
      const id = reqHlIds[i];
      if (id && liveHlById.has(id)) {
        const newText = reqHlTexts[i] || "";
        const oldText = liveHlById.get(id) || "";
        if (newText !== oldText) {
          changedHeadlines.push({ id, oldText, newText });
        }
      }
    }
    const changedDescriptions: { id: string; oldText: string; newText: string }[] = [];
    for (let i = 0; i < reqDescIds.length; i++) {
      const id = reqDescIds[i];
      if (id && liveDescById.has(id)) {
        const newText = reqDescTexts[i] || "";
        const oldText = liveDescById.get(id) || "";
        if (newText !== oldText) {
          changedDescriptions.push({ id, oldText, newText });
        }
      }
    }

    // Removed: ID in live, not in request
    const reqHlIdSet = new Set(reqHlIds.filter(Boolean));
    const removedHeadlines: { id: string; text: string }[] = [];
    for (const [id, text] of liveHlById) {
      if (!reqHlIdSet.has(id)) removedHeadlines.push({ id, text });
    }
    const reqDescIdSet = new Set(reqDescIds.filter(Boolean));
    const removedDescriptions: { id: string; text: string }[] = [];
    for (const [id, text] of liveDescById) {
      if (!reqDescIdSet.has(id)) removedDescriptions.push({ id, text });
    }

    // New: empty ID in request
    const newHeadlines: { text: string }[] = [];
    for (let i = 0; i < reqHlIds.length; i++) {
      if (!reqHlIds[i] && reqHlTexts[i]) {
        newHeadlines.push({ text: reqHlTexts[i] });
      }
    }
    const newDescriptions: { text: string }[] = [];
    for (let i = 0; i < reqDescIds.length; i++) {
      if (!reqDescIds[i] && reqDescTexts[i]) {
        newDescriptions.push({ text: reqDescTexts[i] });
      }
    }

    const hasHlChanges = changedHeadlines.length + removedHeadlines.length + newHeadlines.length > 0;
    const hasDescChanges = changedDescriptions.length + removedDescriptions.length + newDescriptions.length > 0;

    const liveLandingPage = (assetGroup.finalUrl || "") as string;
    const liveYoutubeUrls = ((assetGroup as any)._originalYoutubeUrls || (assetGroup as any).youtubeUrls || ((assetGroup as any).youtubeUrl ? [(assetGroup as any).youtubeUrl] : [])) as string[];
    const liveImages = ((assetGroup.assignedImages || []) as any[]).map((img: any) => ({
      url: img?.url || img?.asset_url || img || "",
      filename: img?.filename || img?.originalName || "",
      category: img?.category || "",
      width: img?.width || img?.metadata?.width || 0,
      height: img?.height || img?.metadata?.height || 0,
      sourcePage: img?.source_page || img?.sourcePage || "",
      contentType: img?.contentType || img?.mimeType || "",
    })).filter((img: any) => img.url);
    const urlChanged = selectedReq.landingPageUrl && selectedReq.landingPageUrl !== liveLandingPage;
    const reqYtUrls: string[] = selectedReq.youtubeUrls || [];
    const ytChanged = reqYtUrls.length !== liveYoutubeUrls.length || reqYtUrls.some((url: string, i: number) => url !== liveYoutubeUrls[i]);
    const imgChanged = selectedReq.imageUrls?.length > 0;

    return (
      <div>
        <button
          onClick={() => setSelectedReq(null)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          &larr; Back to requests
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Change #{selectedReq.id}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Campaign: <strong>{displayName}</strong> ({displayType === "search" ? "Search" : "Performance Max"})
          {" "}&middot; Submitted by {selectedReq.submittedBy}{" "}&middot;{" "}
          {new Date(selectedReq.submittedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>

        {/* ── Headlines ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Headlines</h3>
          {hasHlChanges ? (
            <div className="space-y-3">
              {changedHeadlines.map((ch) => (
                <div key={ch.id} className="border-2 border-orange-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-50 px-4 py-2 border-b border-orange-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Headline — Changed</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Old</span>
                      <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1">{ch.oldText || "(empty)"}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                      <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1">{ch.newText}</span>
                    </div>
                  </div>
                </div>
              ))}
              {removedHeadlines.map((r) => (
                <div key={r.id} className="border-2 border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Headline — Removed</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Was</span>
                      <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1">{r.text || "(empty)"}</span>
                    </div>
                  </div>
                </div>
              ))}
              {newHeadlines.map((n, i) => (
                <div key={`new-hl-${i}`} className="border-2 border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Headline — Added</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                      <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1">{n.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 px-3">No changes to headlines.</p>
          )}
        </div>

        {/* ── Descriptions ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Descriptions</h3>
          {hasDescChanges ? (
            <div className="space-y-3">
              {changedDescriptions.map((ch) => (
                <div key={ch.id} className="border-2 border-orange-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-50 px-4 py-2 border-b border-orange-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Description — Changed</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Old</span>
                      <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1">{ch.oldText || "(empty)"}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                      <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1">{ch.newText}</span>
                    </div>
                  </div>
                </div>
              ))}
              {removedDescriptions.map((r) => (
                <div key={r.id} className="border-2 border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Description — Removed</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Was</span>
                      <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1">{r.text || "(empty)"}</span>
                    </div>
                  </div>
                </div>
              ))}
              {newDescriptions.map((n, i) => (
                <div key={`new-desc-${i}`} className="border-2 border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Description — Added</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                      <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1">{n.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 px-3">No changes to descriptions.</p>
          )}
        </div>

        {/* ── Landing Page ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Landing Page</h3>
          {urlChanged ? (
            <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
              <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Landing Page — Changed</span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Old</span>
                  <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1 break-all">{liveLandingPage || "(none)"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                  <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1 break-all">{selectedReq.landingPageUrl}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 px-3 break-all">{liveLandingPage || "(none)"}</p>
          )}
        </div>

        {/* ── YouTube URLs ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">YouTube URLs</h3>
          {ytChanged ? (
            <div className="space-y-3">
              {liveYoutubeUrls.map((url, i) => {
                const proposed = reqYtUrls[i];
                if (i < reqYtUrls.length && proposed !== url) {
                  return (
                    <div key={i} className="border-2 border-orange-200 rounded-xl overflow-hidden">
                      <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">YouTube URL {i + 1} — Changed</span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Old</span>
                          <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1 break-all">{url || "(empty)"}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-bold uppercase text-green-600 w-12 shrink-0 pt-0.5">New</span>
                          <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1 break-all">{proposed}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              {liveYoutubeUrls.slice(reqYtUrls.length).map((url, i) => (
                <div key={`removed-yt-${i}`} className="border-2 border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">YouTube URL {reqYtUrls.length + i + 1} — Removed</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase text-red-500 w-12 shrink-0 pt-0.5">Was</span>
                      <span className="text-sm text-red-700 line-through bg-red-50 px-3 py-2 rounded-lg flex-1 break-all">{url || "(empty)"}</span>
                    </div>
                  </div>
                </div>
              ))}
              {reqYtUrls.slice(liveYoutubeUrls.length).map((url, i) => (
                <div key={`new-yt-${i}`} className="border-2 border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wide">YouTube URL {liveYoutubeUrls.length + i + 1} — Added</span>
                  </div>
                  <div className="p-4">
                    <span className="text-sm text-green-800 font-semibold bg-green-100 px-3 py-2 rounded-lg flex-1 break-all">{url}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {liveYoutubeUrls.length > 0 ? liveYoutubeUrls.map((url, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right shrink-0 pt-0.5">{i + 1}</span>
                  <span className="text-sm text-gray-600 break-all">{url}</span>
                </div>
              )) : <p className="text-sm text-gray-400">No YouTube URLs</p>}
            </div>
          )}
        </div>

        {/* ── Images ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Images ({liveImages.length})
          </h3>
          {imgChanged ? (
            <div className="space-y-6">
              <div className="border-2 border-orange-200 rounded-xl overflow-hidden">
                <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                  <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Images — Changed</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-gray-400 mb-3">Current</div>
                      {liveImages.length > 0 ? liveImages.map((img: any, i: number) => (
                        <ImageCard key={i} image={img} index={i} variant="old" />
                      )) : <span className="text-xs text-gray-400">(none)</span>}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-green-700 mb-3">Proposed</div>
                      {selectedReq.imageUrls.map((url: string, i: number) => (
                        <ImageCard key={i} image={{ url }} index={i} variant="new" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {liveImages.length > 0 ? liveImages.map((img: any, i: number) => (
                <ImageCard key={i} image={img} index={i} variant="default" />
              )) : <p className="text-sm text-gray-400 col-span-full">No images</p>}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={async () => {
              await fetch(`/api/creative-requests/${selectedReq._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "approved",
                  reviewedBy: user.email,
                }),
              });
              setRequests((prev) =>
                prev.map((r) => (r._id === selectedReq._id ? { ...r, status: "approved" } : r))
              );
              setSelectedReq(null);
            }}
            className="px-6 py-3 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={async () => {
              const reason = prompt("What needs to change? (optional):");
              await fetch(`/api/creative-requests/${selectedReq._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "rejected",
                  reviewedBy: user.email,
                  rejectionReason: reason || "",
                }),
              });
              setRequests((prev) =>
                prev.map((r) => (r._id === selectedReq._id ? { ...r, status: "rejected", rejectionReason: reason } : r))
              );
              setSelectedReq(null);
            }}
            className="px-6 py-3 border border-red-300 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Request Changes
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Pending Changes
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Review and apply proposed changes.
      </p>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((req) => {
              const campName = getCampaignName(req.campaignId);
              const changedFields: string[] = [];
              if (req.headlines?.length)
                changedFields.push(`${req.headlines.length} headlines`);
              if (req.descriptions?.length)
                changedFields.push(`${req.descriptions.length} descriptions`);
              if (req.landingPageUrl) changedFields.push("landing page");
              if (req.youtubeUrls?.length) changedFields.push(`${req.youtubeUrls.length} YouTube URLs`);
              if (req.imageUrls?.length > 0) changedFields.push(`${req.imageUrls.length} images`);

              return (
                <div
                  key={req._id || req.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-orange-200 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      Change #{req.id} — {campName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {req.submittedBy} &middot;{" "}
                      {new Date(req.submittedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Changed: {changedFields.join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReq(req)}
                    className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-hover transition-colors shrink-0"
                  >
                    Review
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Reviewed ({processed.length})
          </h2>
          <div className="space-y-2">
            {processed.map((req) => {
              const campName = getCampaignName(req.campaignId);
              return (
                <div
                  key={req._id || req.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      Change #{req.id} — {campName}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {req.submittedBy} &middot; Reviewed by {req.reviewedBy}
                    </div>
                  </div>
                  <span
                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${
                      req.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {req.status === "approved" ? "Approved" : "Changes Requested"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
