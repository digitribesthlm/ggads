import { readFileSync } from "fs";
import { parseGoogleAdsCsv } from "../src/lib/csv-import";
import { getDb } from "../src/lib/mongodb";

function readCsvUtf16(path: string): string {
  const buf = readFileSync(path);
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf);
  }
  return new TextDecoder("utf-8").decode(buf);
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const csvPath = process.argv[2] || "Climber AB++1_Ad groups+10_Asset groups+2026-05-19_v2.csv";
  console.log("Reading CSV:", csvPath);
  const text = readCsvUtf16(csvPath);
  const campaigns = parseGoogleAdsCsv(text);

  const db = await getDb();
  const collName = process.env.COLLECTION_CAMPAIGNS || "ggads_campaigns";
  const coll = db.collection(collName);

  // Clear old data
  await coll.deleteMany({});
  let asgCounter = 0;

  for (const c of campaigns) {
    const campaignId = slug(c.campaignName);
    const adGroups = c.adGroups.map((ag, agIdx) => ({
      ...ag,
      id: `${campaignId}-ag-${agIdx}`,
      assetGroups: ag.assetGroups.map((asg) => {
        const asgId = `${campaignId}-asg-${asgCounter++}`;
        return {
          ...asg,
          id: asgId,
          headlines: (asg.headlines || []).map((h: string, hi: number) => ({
            id: `${asgId}-hl-${hi}`, text: h,
          })),
          longHeadlines: (asg.longHeadlines || []).map((h: string, hi: number) => ({
            id: `${asgId}-lhl-${hi}`, text: h,
          })),
          descriptions: (asg.descriptions || []).map((d: string, di: number) => ({
            id: `${asgId}-desc-${di}`, text: d,
          })),
          // Normalize flat fields too
          landingPageId: `${asgId}-url`,
          callToActionId: `${asgId}-cta`,
          businessNameId: `${asgId}-biz`,
          youtubeVideoIds: (asg as any).videoIds || [],
        };
      }),
    }));

    const doc = {
      id: campaignId,
      accountId: c.accountId,
      accountName: c.accountName,
      campaignName: c.campaignName,
      domain: c.domain,
      type: c.type,
      labels: c.labels,
      adGroups,
      updatedAt: new Date(),
    };

    await coll.updateOne(
      { id: campaignId },
      { $set: doc },
      { upsert: true }
    );
    console.log(`  ${c.campaignName} → ${campaignId} (${adGroups.length} AGs, ${adGroups.reduce((s, ag) => s + ag.assetGroups.length, 0)} ASGs)`);
  }

  console.log(`Done. ${campaigns.length} campaigns in ${collName}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
