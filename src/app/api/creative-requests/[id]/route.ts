import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

const REQ_COLL = process.env.COLLECTION_CREATIVE_REQUESTS ?? "ggads_creative_requests";
const LOG_COLL = process.env.COLLECTION_CHANGE_LOG ?? "ggads_change_log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUserFromRequest(request);
  if (!authUser || authUser.role !== "account_manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    const result = await db.collection(REQ_COLL).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...body, reviewedAt: new Date().toISOString() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Log the action
    await db.collection(LOG_COLL).insertOne({
      requestId: id,
      campaignId: result.campaignId,
      campaignName: result.campaignName || "",
      actor: body.reviewedBy || "account_manager",
      actorEmail: body.reviewedBy || "",
      action: body.status === "approved" ? "done" : "changes_needed",
      timestamp: new Date().toISOString(),
      summary: body.status === "approved"
        ? `Done — Request #${id}`
        : `Changes needed — Request #${id}${body.rejectionReason ? ` — ${body.rejectionReason}` : ""}`,
    });

    // On approval, apply changes to the campaign data
    if (body.status === "approved") {
      const campaignCollName = process.env.COLLECTION_CAMPAIGNS ?? "ggads_campaigns";
      const campaignsColl = db.collection(campaignCollName);
      const allCampaigns = await campaignsColl.find({}).toArray();

      for (const campaign of allCampaigns) {
        let updated = false;
        for (const ag of campaign.adGroups || []) {
          for (const asg of ag.assetGroups || []) {
            const asgId = asg.id || `${campaign.campaignName}__${asg.name}`;
            if (asgId !== result.campaignId) continue;

            // Apply headline changes using IDs
            if (result.headlineIds && result.headlines) {
              const reqIds: string[] = result.headlineIds;
              const reqTexts: string[] = result.headlines;

              // Build new headlines with proper IDs
              const newHeadlines: any[] = [];
              for (let i = 0; i < reqTexts.length; i++) {
                const id = reqIds[i] || "";
                const text = reqTexts[i] || "";
                if (id && text) {
                  newHeadlines.push({ id, text });
                } else if (!id && text) {
                  // New headline — assign an ID
                  newHeadlines.push({ id: `${asgId}-hl-new-${Date.now()}-${i}`, text });
                }
              }
              asg.headlines = newHeadlines;
              updated = true;
            }

            // Apply description changes using IDs
            if (result.descriptionIds && result.descriptions) {
              const reqIds: string[] = result.descriptionIds;
              const reqTexts: string[] = result.descriptions;
              const newDescriptions: any[] = [];
              for (let i = 0; i < reqTexts.length; i++) {
                const id = reqIds[i] || "";
                const text = reqTexts[i] || "";
                if (id && text) {
                  newDescriptions.push({ id, text });
                } else if (!id && text) {
                  newDescriptions.push({ id: `${asgId}-desc-new-${Date.now()}-${i}`, text });
                }
              }
              asg.descriptions = newDescriptions;
              updated = true;
            }

            // Apply landing page URL change
            if (result.landingPageUrl) {
              asg.finalUrl = result.landingPageUrl;
              updated = true;
            }

            // Apply YouTube URL changes
            if (result.youtubeUrls?.length > 0) {
              (asg as any).youtubeUrls = result.youtubeUrls;
              updated = true;
            }

            // Apply image changes
            if (result.imageUrls?.length > 0) {
              asg.assignedImages = result.imageUrls.map((url: string) => ({ url }));
              updated = true;
            }
          }
        }

        if (updated) {
          await campaignsColl.updateOne(
            { _id: campaign._id },
            { $set: { adGroups: campaign.adGroups, updatedAt: new Date().toISOString() } }
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.collection(REQ_COLL).deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
