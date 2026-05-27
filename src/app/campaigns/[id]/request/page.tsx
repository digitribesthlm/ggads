"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import ImagePicker from "@/components/ImagePicker";
import Link from "next/link";
import type { ImportedCampaign } from "@/lib/types";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
  } catch {}
  return null;
}

export default function CampaignRequestPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  // Load campaign data
  useEffect(() => {
    fetch(`/api/campaigns/${user?.domain || ".se"}`)
      .then((r) => r.json())
      .then((data) => {
        const campaigns: ImportedCampaign[] = data.campaigns || [];
        let found: any = null;
        for (const c of campaigns) {
          for (const ag of c.adGroups) {
            for (const asg of ag.assetGroups) {
              const asgId = (asg as any).id || `${c.campaignName}__${asg.name}`;
              if (asgId === campaignId || `${c.campaignName}__${asg.name}` === campaignId) {
                found = { campaign: c, assetGroup: asg };
              }
            }
          }
        }
        if (!found) {
          const camp = campaigns.find((c: any) => (c.id || c.campaignName) === campaignId);
          if (camp) {
            // Auto-select first asset group if campaign was matched by name only
            const firstAG = camp.adGroups?.[0]?.assetGroups?.[0];
            found = { campaign: camp, assetGroup: firstAG || null };
          }
        }
        if (found) {
          const c = found.campaign;
          const a = found.assetGroup;
          setCampaign({
            id: campaignId,
            clientId: c.accountId,
            domain: c.domain,
            name: a ? `${c.campaignName} — ${a.name}` : c.campaignName,
            campaignName: c.campaignName,
            assetGroupName: a?.name || "",
            type: c.type,
            headlines: (a?.headlines || []).map((h: string) => h),
            headlineIds: (a?.headlineIds || []) as string[],
            descriptions: (a?.descriptions || []).map((d: string) => d),
            descriptionIds: (a?.descriptionIds || []) as string[],
            landingPageUrl: a?.finalUrl || "",
            youtubeUrls: ((a as any)?.youtubeUrls || ((a as any)?.youtubeUrl ? [(a as any).youtubeUrl] : [])) as string[],
            imageUrls: ((a as any)?.assignedImages || []).map((img: any) => img.url || img.asset_url || "").filter(Boolean),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId]);

  // Form state — headlines/descriptions always aligned with headlineIds/descriptionIds
  const [headlineIds, setHeadlineIds] = useState<string[]>([]);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [descriptionIds, setDescriptionIds] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [landingPageUrl, setLandingPageUrl] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingReq, setPendingReq] = useState<any>(null);
  const [pendingChangedHlIds, setPendingChangedHlIds] = useState<Set<string>>(new Set());
  const [markedForRemovalHl, setMarkedForRemovalHl] = useState<Set<string>>(new Set());
  const [markedForRemovalDesc, setMarkedForRemovalDesc] = useState<Set<string>>(new Set());
  const [cfg, setCfg] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form when campaign loads
  useEffect(() => {
    if (campaign) {
      setHeadlineIds([...(campaign.headlineIds || [])]);
      setHeadlines([...campaign.headlines]);
      setDescriptionIds([...(campaign.descriptionIds || [])]);
      setDescriptions([...campaign.descriptions]);
      setLandingPageUrl(campaign.landingPageUrl);
      setYoutubeUrls([...(campaign.youtubeUrls || [])]);
      setImageUrls(campaign.imageUrls);
      setMarkedForRemovalHl(new Set());
      setMarkedForRemovalDesc(new Set());
    }
  }, [campaign]);

  // Fetch pending request for this asset group
  useEffect(() => {
    fetch("/api/creative-requests")
      .then((r) => r.json())
      .then((data: any[]) => {
        const pending = data.find(
          (r: any) => r.campaignId === campaignId && r.status === "pending_review"
        );
        if (pending && pending.headlineIds && pending.headlines) {
          setPendingReq(pending);
          setHeadlineIds([...pending.headlineIds]);
          setHeadlines([...pending.headlines]);
          if (pending.descriptionIds && pending.descriptions) {
            setDescriptionIds([...pending.descriptionIds]);
            setDescriptions([...pending.descriptions]);
          }
          // Track changed headline IDs (text differs from live)
          if (campaign) {
            const liveById = new Map<string, string>();
            (campaign.headlineIds || []).forEach((id: string, i: number) => {
              liveById.set(id, (campaign.headlines || [])[i] || "");
            });
            const changed = new Set<string>();
            (pending.headlineIds || []).forEach((id: string, i: number) => {
              if (id && liveById.has(id)) {
                if ((pending.headlines[i] || "") !== (liveById.get(id) || "")) {
                  changed.add(id);
                }
              } else if (!id) {
                changed.add(`new-${i}`);
              }
            });
            setPendingChangedHlIds(changed);
          }
        }
      })
      .catch(() => {});
  }, [campaignId, campaign]);

  // Fetch config for limits
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});
  }, []);

  // Auth check
  useEffect(() => { if (!user) router.replace("/"); }, [user, router]);

  const handleSubmit = useCallback(async () => {
    // Filter out headlines/descriptions marked for removal
    const submittedHlIds: string[] = [];
    const submittedHl: string[] = [];
    for (let i = 0; i < headlineIds.length; i++) {
      if (!markedForRemovalHl.has(headlineIds[i])) {
        submittedHlIds.push(headlineIds[i]);
        submittedHl.push(headlines[i] || "");
      }
    }
    const submittedDescIds: string[] = [];
    const submittedDesc: string[] = [];
    for (let i = 0; i < descriptionIds.length; i++) {
      if (!markedForRemovalDesc.has(descriptionIds[i])) {
        submittedDescIds.push(descriptionIds[i]);
        submittedDesc.push(descriptions[i] || "");
      }
    }

    const body = {
      campaignId,
      campaignName: campaign?.campaignName || "",
      clientId: campaign?.clientId || "",
      headlineIds: submittedHlIds,
      headlines: submittedHl,
      descriptionIds: submittedDescIds,
      descriptions: submittedDesc,
      landingPageUrl: landingPageUrl !== (campaign?.landingPageUrl || "") ? landingPageUrl : "",
      imageUrls,
      youtubeUrls,
      submittedBy: user?.email || "",
    };

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/creative-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || `HTTP ${res.status}`);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message || "Network error");
      setSubmitting(false);
    }
  }, [campaignId, headlineIds, headlines, descriptionIds, descriptions, landingPageUrl, youtubeUrls, imageUrls, campaign, user, markedForRemovalHl, markedForRemovalDesc]);

  const handleFileUpload = async (file: File) => {
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      setImageUrls((prev) => [...prev, data.url]);
    } catch {}
  };

  const handleImageSelect = (urls: string[]) => {
    setImageUrls((prev) => [...prev, ...urls.filter((u) => !prev.includes(u))]);
    setPickerOpen(false);
  };

  if (!user) return null;
  if (loading) return <div className="p-12 text-center text-slate-light text-sm">Loading...</div>;
  if (!campaign) return (
    <div className="p-12 text-center">
      <p className="text-slate-light text-sm mb-4">Campaign or asset group not found.</p>
      <Link href="/dashboard" className="text-brand text-sm hover:underline">Back to campaigns</Link>
    </div>
  );

  if (submitted) {
    return (
      <div>
        <Link href="/dashboard" className="text-[13px] text-slate-light hover:text-slate mb-8 inline-block">&larr; Campaigns</Link>
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="text-3xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-slate mb-2">Change Request Submitted</h2>
          <p className="text-sm text-slate-light mb-6">Your changes are pending.</p>
          <Link href="/dashboard" className="inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const isPMax = campaign.type === "pmax";
  const typeCfg = cfg?.types?.[campaign.type] || {};
  const maxHeadlines = typeCfg.maxHeadlines ?? 15;
  const maxDescriptions = typeCfg.maxDescriptions ?? (isPMax ? 5 : 4);
  const maxYoutubeUrls = typeCfg.maxYoutubeUrls ?? 20;
  const headlineSlots = Math.max(headlines.length, typeCfg.minHeadlineSlots ?? (isPMax ? 5 : 3));
  const descSlots = Math.max(descriptions.length, typeCfg.minDescriptionSlots ?? (isPMax ? 4 : 2));
  const atHeadlineLimit = headlines.length >= maxHeadlines;
  const atDescLimit = descriptions.length >= maxDescriptions;

  return (
    <div>
      <Link href="/dashboard" className="text-[13px] text-slate-light hover:text-slate mb-8 inline-block">&larr; Back</Link>

      <div className="text-xs text-slate-light mb-2">
        {campaign.campaignName}{campaign.assetGroupName ? ` / ${campaign.assetGroupName}` : ""}
      </div>
      <h1 className="text-[28px] font-bold text-slate mb-1">Edit Creative</h1>
      <p className="text-sm text-slate-light mb-10">Changes are applied after processing.</p>

      {pendingReq && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-orange-500 text-sm">&#x25CF;</span>
              <span className="text-sm text-orange-800 font-medium">Pending Review</span>
              <span className="text-xs text-orange-600">
                — {pendingChangedHlIds.size} headline{pendingChangedHlIds.size !== 1 ? 's' : ''} pending
              </span>
            </div>
            <button
              onClick={async () => {
                await fetch(`/api/creative-requests/${pendingReq._id}`, { method: "DELETE" });
                setPendingReq(null);
                setPendingChangedHlIds(new Set());
                setMarkedForRemovalHl(new Set());
                setMarkedForRemovalDesc(new Set());
                // Reset form to live data
                if (campaign) {
                  setHeadlineIds([...(campaign.headlineIds || [])]);
                  setHeadlines([...campaign.headlines]);
                  setDescriptionIds([...(campaign.descriptionIds || [])]);
                  setDescriptions([...campaign.descriptions]);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Headlines */}
      <div className="mb-9">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-light mb-3 flex items-center justify-between">
          Headlines
          <span className={`font-normal normal-case tracking-normal text-xs ${atHeadlineLimit ? "text-orange-600 font-semibold" : ""}`}>
            {headlines.filter(h => h).length} / {maxHeadlines}
            {atHeadlineLimit && " — limit reached"}
          </span>
        </div>
        {Array.from({ length: headlineSlots }).map((_, i) => {
          const val = headlines[i] || "";
          const id = headlineIds[i] || "";
          // Look up original text by ID (not position) so deletes don't misalign comparisons
          const origIdx = id ? (campaign.headlineIds || []).findIndex((cid: string) => cid === id) : -1;
          const original = origIdx >= 0 ? campaign.headlines[origIdx] || "" : "";
          const isPending = pendingChangedHlIds.has(id);
          const isMarkedForRemoval = !!(id && markedForRemovalHl.has(id));
          const hasChanged = !isPending && !id && val ? true : !isPending && id && val !== original;
          return (
            <div key={id || `hl-slot-${i}`} className={`flex items-center gap-3 mb-2 px-4 py-3 rounded-xl border transition-colors ${
              isMarkedForRemoval ? "bg-red-50 border-red-300" :
              isPending ? "bg-orange-50 border-orange-300" :
              hasChanged ? "bg-brand-light border-brand" : "bg-white border-transparent hover:border-gray-200"
            }`}>
              <span className="text-xs font-semibold text-slate-light w-5 text-right shrink-0">{i + 1}</span>
              <input
                type="text"
                value={val}
                onChange={(e) => {
                  const nextHl = [...headlines];
                  const nextIds = [...headlineIds];
                  while (nextHl.length <= i) { nextHl.push(""); nextIds.push(""); }
                  nextHl[i] = e.target.value;
                  setHeadlines(nextHl);
                  setHeadlineIds(nextIds);
                }}
                maxLength={30}
                disabled={isPending || isMarkedForRemoval}
                className={`flex-1 border-none bg-transparent text-sm outline-none placeholder:text-gray-300 ${
                  isMarkedForRemoval ? "text-red-600 line-through" : isPending ? "text-slate font-medium" : "text-slate"
                }`}
              />
              <span className="text-[10px] text-slate-light shrink-0">{val ? `${val.length}/30` : "—"}</span>
              {/* Delete button — marks for removal (visual strikethrough), actual removal on submit */}
              <button
                onClick={() => {
                  if (id) {
                    setMarkedForRemovalHl((prev) => new Set([...prev, id]));
                  }
                }}
                disabled={isPending || markedForRemovalHl.has(id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-colors ${isPending || markedForRemovalHl.has(id) ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                title="Mark for removal"
              >
                &times;
              </button>
              {isMarkedForRemoval ? (
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500" title="Marked for removal" />
              ) : isPending ? (
                <span className="text-orange-500 text-xs shrink-0" title="Under review">&#x25CF;</span>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasChanged ? "bg-brand" : "bg-gray-300"}`} />
              )}
            </div>
          );
        })}
        {atHeadlineLimit ? (
          <p className="mt-2 text-xs text-orange-600">Limit: {maxHeadlines} headlines maximum for this campaign type.</p>
        ) : (
          <button onClick={() => { setHeadlineIds([...headlineIds, ""]); setHeadlines([...headlines, ""]); }}
            className="mt-2 px-4 py-2 text-xs text-slate-light border border-dashed border-gray-200 rounded-lg hover:text-brand hover:border-brand">
            + Add headline
          </button>
        )}
      </div>

      {/* Descriptions */}
      <div className="mb-9">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-light mb-3 flex items-center justify-between">
          Descriptions
          <span className={`font-normal normal-case tracking-normal text-xs ${atDescLimit ? "text-orange-600 font-semibold" : ""}`}>
            {descriptions.filter(d => d).length} / {maxDescriptions}
            {atDescLimit && " — limit reached"}
          </span>
        </div>
        {Array.from({ length: descSlots }).map((_, i) => {
          const val = descriptions[i] || "";
          const id = descriptionIds[i] || "";
          const origIdx = id ? (campaign.descriptionIds || []).findIndex((cid: string) => cid === id) : -1;
          const original = origIdx >= 0 ? campaign.descriptions[origIdx] || "" : "";
          const isMarkedForRemoval = !!(id && markedForRemovalDesc.has(id));
          const hasChanged = !isMarkedForRemoval && !id && val ? true : !isMarkedForRemoval && id && val !== original;
          return (
            <div key={id || `desc-slot-${i}`} className={`flex items-start gap-3 mb-2 px-4 py-3 rounded-xl border transition-colors ${
              isMarkedForRemoval ? "bg-red-50 border-red-300" :
              hasChanged ? "bg-brand-light border-brand" : "bg-white border-transparent hover:border-gray-200"
            }`}>
              <span className="text-xs font-semibold text-slate-light w-5 text-right shrink-0 pt-1">{i + 1}</span>
              <textarea
                value={val}
                onChange={(e) => {
                  const nextDesc = [...descriptions];
                  const nextIds = [...descriptionIds];
                  while (nextDesc.length <= i) { nextDesc.push(""); nextIds.push(""); }
                  nextDesc[i] = e.target.value;
                  setDescriptions(nextDesc);
                  setDescriptionIds(nextIds);
                }}
                maxLength={90}
                rows={2}
                disabled={isMarkedForRemoval}
                className={`flex-1 border-none bg-transparent text-sm outline-none resize-none placeholder:text-gray-300 ${isMarkedForRemoval ? "text-red-600 line-through" : "text-slate"}`}
              />
              <span className="text-[10px] text-slate-light shrink-0 pt-1">{val ? `${val.length}/90` : "—"}</span>
              {/* Delete button — marks for removal */}
              <button
                onClick={() => {
                  if (id) {
                    setMarkedForRemovalDesc((prev) => new Set([...prev, id]));
                  }
                }}
                disabled={isMarkedForRemoval}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-colors mt-0.5 ${isMarkedForRemoval ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                title="Mark for removal"
              >
                &times;
              </button>
              {isMarkedForRemoval ? (
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-2 bg-red-500" title="Marked for removal" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${hasChanged ? "bg-brand" : "bg-gray-300"}`} />
              )}
            </div>
          );
        })}
        {atDescLimit ? (
          <p className="mt-2 text-xs text-orange-600">Limit: {maxDescriptions} descriptions maximum for this campaign type.</p>
        ) : (
          <button onClick={() => { setDescriptionIds([...descriptionIds, ""]); setDescriptions([...descriptions, ""]); }}
            className="mt-2 px-4 py-2 text-xs text-slate-light border border-dashed border-gray-200 rounded-lg hover:text-brand hover:border-brand">
            + Add description
          </button>
        )}
      </div>

      {/* Landing Page */}
      <div className="mb-9">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-light mb-3">Landing Page</div>
        <div className={`px-4 py-3.5 rounded-xl border ${landingPageUrl !== (campaign.landingPageUrl || "") ? "bg-brand-light border-brand" : "bg-white border-gray-200"}`}>
          <input
            type="url"
            value={landingPageUrl}
            onChange={(e) => setLandingPageUrl(e.target.value)}
            className="w-full border-none bg-transparent text-sm text-slate outline-none"
          />
        </div>
      </div>

      {/* YouTube URLs */}
      <div className="mb-9">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-light mb-3 flex items-center justify-between">
          YouTube URLs
          <span className={`font-normal normal-case tracking-normal text-xs ${youtubeUrls.length >= maxYoutubeUrls ? "text-orange-600 font-semibold" : ""}`}>
            {youtubeUrls.filter(u => u).length} / {maxYoutubeUrls}
            {youtubeUrls.length >= maxYoutubeUrls && " — limit reached"}
          </span>
        </div>
        <div className="space-y-3">
          {youtubeUrls.map((url, i) => {
            const videoId = extractYouTubeId(url);
            const originalYt = (campaign?.youtubeUrls || [])[i] || "";
            const hasChanged = url !== originalYt;
            return (
              <div key={i} className={`rounded-xl border overflow-hidden ${
                hasChanged ? "bg-brand-light border-brand" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-light w-5 text-right shrink-0">{i + 1}</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const next = [...youtubeUrls];
                      next[i] = e.target.value;
                      setYoutubeUrls(next);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 border-none bg-transparent text-sm text-slate outline-none placeholder:text-gray-300"
                  />
                  <button
                    onClick={() => setYoutubeUrls(youtubeUrls.filter((_, idx) => idx !== i))}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove URL"
                  >
                    &times;
                  </button>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasChanged ? "bg-brand" : "bg-gray-300"}`} />
                </div>
                {videoId && (
                  <div className="px-4 pb-3">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`YouTube video ${i + 1}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {youtubeUrls.length >= maxYoutubeUrls ? (
          <p className="mt-2 text-xs text-orange-600">Limit: {maxYoutubeUrls} YouTube URLs maximum.</p>
        ) : (
          <button onClick={() => setYoutubeUrls([...youtubeUrls, ""])}
            className="mt-2 px-4 py-2 text-xs text-slate-light border border-dashed border-gray-200 rounded-lg hover:text-brand hover:border-brand">
            + Add YouTube URL
          </button>
        )}
      </div>

      {/* Images */}
      <div className="mb-9">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-light mb-3 flex items-center justify-between">
          Images
          <span className="font-normal normal-case tracking-normal text-xs">{imageUrls.length} / 20</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="w-[120px] h-16 rounded-[10px] bg-white border-2 border-gray-200 shrink-0 overflow-hidden relative group">
              <img src={url} alt="" className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <button onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white text-[8px] rounded-full hidden group-hover:flex items-center justify-center">&times;</button>
            </div>
          ))}
          <div onClick={() => fileInputRef.current?.click()}
            className="w-[120px] h-16 rounded-[10px] bg-white border-2 border-dashed border-gray-200 shrink-0 flex items-center justify-center text-xl text-slate-light cursor-pointer hover:border-brand transition-colors">
            +
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={async (e) => { if (e.target.files?.[0]) await handleFileUpload(e.target.files[0]); e.target.value = ""; }} />
        </div>
        <button onClick={() => setPickerOpen(true)}
          className="mt-2 px-4 py-2 border border-brand text-brand rounded-lg text-xs font-semibold bg-white hover:bg-brand-light transition-colors">
          Browse Library
        </button>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-8 border-t border-gray-200">
        <button onClick={handleSubmit} disabled={submitting}
          className="px-7 py-3 bg-brand text-white rounded-[10px] text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit Change Request"}
        </button>
        <Link href="/dashboard"
          className="px-7 py-3 bg-white border border-gray-200 text-slate-light rounded-[10px] text-sm font-semibold hover:bg-warm-gray transition-colors">
          Cancel
        </Link>
      </div>

      {pickerOpen && (
        <ImagePicker
          pageUrl={landingPageUrl || campaign.landingPageUrl || ""}
          domain={campaign.domain || ".se"}
          selected={imageUrls}
          onSelect={handleImageSelect}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
