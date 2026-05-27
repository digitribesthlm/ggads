import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { parseGoogleAdsCsv } from "@/lib/csv-import";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { isValidDomain } from "@/lib/domains";
import type { Domain } from "@/lib/types";

function readCsvUtf16(path: string): string {
  const buf = readFileSync(path);
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf);
  }
  return new TextDecoder("utf-8").decode(buf);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const authUser = await getUserFromRequest(request);

    // Validate domain
    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: "Invalid domain", validDomains: [".se", ".fi", ".nl", ".uk"] },
        { status: 400 }
      );
    }

    // Client users can only access their own domain
    if (authUser && authUser.role === "client") {
      if (authUser.domain && authUser.domain !== domain) {
        return NextResponse.json(
          { error: "Access denied — your account is scoped to a different country" },
          { status: 403 }
        );
      }
    }

    const db = await getDb();
    const campaignCollName = process.env.COLLECTION_CAMPAIGNS ?? "ggads_campaigns";
    const campaignsColl = db.collection(campaignCollName);
    const docCount = await campaignsColl.countDocuments();

    let campaigns: any[];

    if (docCount > 0) {
      // Build filter: domain + optional client scoping
      const filter: Record<string, any> = { domain };

      // Client users see only their client's campaigns
      if (authUser && authUser.role === "client" && authUser.clientId) {
        filter.clientId = authUser.clientId;
      }

      const docs = await campaignsColl.find(filter).toArray();
      campaigns = docs.map((doc) => {
        const { _id, updatedAt, ...campaign } = doc as any;
        return campaign;
      });
    } else {
      // First boot — import from CSV (Sweden only for legacy support)
      if (domain !== ".se") {
        return NextResponse.json(
          { campaigns: [], note: `No campaigns imported yet for ${domain}. Import a CSV or populate via admin panel.` },
          { status: 200 }
        );
      }

      const csvPath =
        process.env.CSV_PMAX_PATH ??
        "Brand AB++1_Ad groups+10_Asset groups+2026-05-19_v2.csv";
      const text = readCsvUtf16(csvPath);
      const imported = parseGoogleAdsCsv(text);
      campaigns = imported.filter((c: any) => c.domain === ".se");
    }

    // Normalize: convert {id, text} objects to arrays
    campaigns = campaigns.map((c: any) => ({
      ...c,
      adGroups: (c.adGroups || []).map((ag: any) => ({
        ...ag,
        assetGroups: (ag.assetGroups || []).map((asg: any) => {
          const asgId = asg.id || `${c.campaignName}__${asg.name}`;
          return {
            ...asg,
            headlineIds: (asg.headlines || []).map((h: any, i: number) =>
              (typeof h === "object" && h.id) ? h.id : `${asgId}-hl-${i}`
            ),
            headlines: (asg.headlines || []).map((h: any) =>
              typeof h === "object" ? (h.text || "") : String(h || "")
            ),
            longHeadlineIds: (asg.longHeadlines || []).map((h: any, i: number) =>
              (typeof h === "object" && h.id) ? h.id : `${asgId}-lhl-${i}`
            ),
            longHeadlines: (asg.longHeadlines || []).map((h: any) =>
              typeof h === "object" ? (h.text || "") : String(h || "")
            ),
            descriptionIds: (asg.descriptions || []).map((d: any, i: number) =>
              (typeof d === "object" && d.id) ? d.id : `${asgId}-desc-${i}`
            ),
            descriptions: (asg.descriptions || []).map((d: any) =>
              typeof d === "object" ? (d.text || "") : String(d || "")
            ),
          };
        }),
      })),
    }));

    // Derive campaign status from asset group states
    campaigns = campaigns.map((c: any) => {
      const allAssetGroups = (c.adGroups || []).flatMap((ag: any) => ag.assetGroups || []);
      const hasLiveAssetGroup = allAssetGroups.some(
        (asg: any) => asg.status === "Enabled" && asg.approvalStatus === "Approved"
      );
      return { ...c, status: hasLiveAssetGroup ? "active" : "creative" };
    });

    // Merge pending creative requests
    const reqCollName = process.env.COLLECTION_CREATIVE_REQUESTS ?? "ggads_creative_requests";
    const pendingReqs = await db.collection(reqCollName)
      .find({ status: "pending_review" })
      .toArray();

    for (const req of pendingReqs) {
      for (const campaign of campaigns) {
        for (const ag of campaign.adGroups || []) {
          for (const asg of ag.assetGroups || []) {
            const asgId = asg.id || `${campaign.campaignName}__${asg.name}`;
            if (asgId === req.campaignId) {
              asg._originalHeadlines = [...(asg.headlines || [])];
              asg._originalHeadlineIds = [...(asg.headlineIds || [])];
              asg._originalDescriptions = [...(asg.descriptions || [])];
              asg._originalDescriptionIds = [...(asg.descriptionIds || [])];
              asg._originalFinalUrl = asg.finalUrl || "";

              const changedHl: string[] = [];
              const changedDesc: string[] = [];
              const removedHl: string[] = [];
              const removedDesc: string[] = [];

              const liveHlById = new Map<string, string>();
              (asg.headlineIds || []).forEach((id: string, i: number) => {
                liveHlById.set(id, (asg.headlines || [])[i] || "");
              });

              if (req.headlineIds && req.headlines) {
                const reqHlIds: string[] = req.headlineIds;
                const reqHlTexts: string[] = req.headlines;
                const reqIdSet = new Set(reqHlIds.filter(Boolean));
                for (const [id] of liveHlById) {
                  if (!reqIdSet.has(id)) removedHl.push(id);
                }
                const newHlTexts: string[] = [];
                const newHlIds: string[] = [];
                for (let i = 0; i < reqHlTexts.length; i++) {
                  const id = reqHlIds[i] || "";
                  const text = reqHlTexts[i] || "";
                  if (id && liveHlById.has(id)) {
                    if (text !== (liveHlById.get(id) || "")) changedHl.push(id);
                    newHlIds.push(id);
                    newHlTexts.push(text);
                  } else if (!id) {
                    const newId = `${asgId}-hl-new-${i}`;
                    newHlIds.push(newId);
                    newHlTexts.push(text);
                    changedHl.push(newId);
                  }
                }
                asg.headlineIds = newHlIds;
                asg.headlines = newHlTexts;
              }

              const liveDescById = new Map<string, string>();
              (asg.descriptionIds || []).forEach((id: string, i: number) => {
                liveDescById.set(id, (asg.descriptions || [])[i] || "");
              });

              if (req.descriptionIds && req.descriptions) {
                const reqDescIds: string[] = req.descriptionIds;
                const reqDescTexts: string[] = req.descriptions;
                const reqIdSet = new Set(reqDescIds.filter(Boolean));
                for (const [id] of liveDescById) {
                  if (!reqIdSet.has(id)) removedDesc.push(id);
                }
                const newDescTexts: string[] = [];
                const newDescIds: string[] = [];
                for (let i = 0; i < reqDescTexts.length; i++) {
                  const id = reqDescIds[i] || "";
                  const text = reqDescTexts[i] || "";
                  if (id && liveDescById.has(id)) {
                    if (text !== (liveDescById.get(id) || "")) changedDesc.push(id);
                    newDescIds.push(id);
                    newDescTexts.push(text);
                  } else if (!id) {
                    const newId = `${asgId}-desc-new-${i}`;
                    newDescIds.push(newId);
                    newDescTexts.push(text);
                    changedDesc.push(newId);
                  }
                }
                asg.descriptionIds = newDescIds;
                asg.descriptions = newDescTexts;
              }
              if (req.landingPageUrl && req.landingPageUrl !== asg.finalUrl) {
                asg.finalUrl = req.landingPageUrl;
              }
              if (req.youtubeUrls?.length > 0) {
                const liveYt = (asg as any).youtubeUrls || ((asg as any).youtubeUrl ? [(asg as any).youtubeUrl] : []);
                const reqYt: string[] = req.youtubeUrls;
                (asg as any)._originalYoutubeUrls = [...liveYt];
                (asg as any).youtubeUrls = reqYt;
              }
              if (req.imageUrls?.length > 0) {
                asg._originalImages = [...(asg.assignedImages || [])];
                asg.assignedImages = req.imageUrls.map((url: string) => ({ url }));
              }

              asg._changedHeadlineIds = changedHl;
              asg._changedDescriptionIds = changedDesc;
              asg._removedHeadlineIds = removedHl;
              asg._removedDescriptionIds = removedDesc;
              asg._pendingRequest = true;
              asg._pendingReqId = req._id?.toString();
            }
          }
        }
      }
    }

    // Enrich with images
    const imageCollName = process.env.COLLECTION_PAGE_IMAGE_ASSIGNMENTS ?? "ggads_page_image_assignments";
    const assignments = db.collection(imageCollName);

    const enriched = await Promise.all(
      campaigns.map(async (campaign: any) => ({
        ...campaign,
        adGroups: await Promise.all(
          (campaign.adGroups || []).map(async (ag: any) => ({
            ...ag,
            assetGroups: await Promise.all(
              (ag.assetGroups || []).map(async (asset: any) => {
                if (asset._pendingRequest && asset.assignedImages?.length > 0) {
                  return asset;
                }
                const variants = [
                  asset.finalUrl,
                  asset.finalUrl?.replace(/\/$/, ""),
                  asset.finalUrl ? (asset.finalUrl.endsWith("/") ? asset.finalUrl : asset.finalUrl + "/") : "",
                ].filter(Boolean);
                const match = variants.length > 0 ? await assignments.findOne({ pageUrl: { $in: variants } }) : null;
                return {
                  ...asset,
                  assignedImages: asset.assignedImages || match?.images || [],
                };
              })
            ),
          }))
        ),
      }))
    );

    // Include user domain info for the frontend
    return NextResponse.json({
      campaigns: enriched,
      domain,
      userDomain: authUser?.domain || null,
    });
  } catch (error) {
    console.error("Campaigns API error:", error);
    return NextResponse.json(
      { error: "Failed to load campaigns", detail: (error as Error).message },
      { status: 500 }
    );
  }
}
