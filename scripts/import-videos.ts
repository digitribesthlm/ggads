import { getDb } from "../src/lib/mongodb";

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).replace(/^\//, "");
  } catch {
    // Try to salvage youtu.be links (handles typos like youtu.e)
    const m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
  }
  return null;
}

function deriveDomain(pageUrl: string): string {
  try {
    const host = new URL(pageUrl).hostname;
    if (host.endsWith(".se")) return ".se";
    if (host.endsWith(".nl")) return ".nl";
    if (host.endsWith(".fi")) return ".fi";
    if (host.includes(".co.uk") || host.endsWith(".uk")) return ".uk";
  } catch {}
  return "";
}

const DATA = `
https://www.climberbi.co.uk/snowflake-ai-data-cloud/	Snowflake AI Data Cloud | Climber	https://www.youtube.com/watch?v=tb_ikMu-cLU	https://www.youtube.com/watch?v=y0oZrJHa80c
https://www.climberbi.co.uk/microsoft-power-bi-services/	Unlock Your Data Potential with Microsoft Power BI | BI Platform Services by Climber BI	https://www.youtube.com/watch?v=yKTSLffVGbk
https://www.climberbi.co.uk/migrating-to-qlik-cloud/	Migrate to Qlik Cloud: Migration Guide for Qlik Sense & QlikView | Climber BI	https://youtu.be/bxNO32APx4s
https://www.climberbi.co.uk/qlik-cloud-analytics/	Qlik Cloud Analytics - Climber BI	https://youtu.be/bxNO32APx4s
https://www.climberbi.co.uk/qlik-talend-data-integration/	Qlik Talend Data Integration | Climber	https://youtu.be/VDSoRA8yKmg	https://youtu.be/pnOTENP6yEs
https://www.climberbi.co.uk/microsoft-fabric/	Microsoft Fabric | Climber	https://youtu.be/WmMa_aPlPCA?si=zDvR1H6om0GKGZIm
https://www.climber.se/vad-vi-gor/tjanster/data-strategy/	Data Strategy | Climber
https://www.climber.se/vad-vi-gor/tjanster/data-analytics/	Data Analytics | Climber
https://www.climber.se/vad-vi-gor/tjanster/ai-readiness/	AI Readiness | Climber
https://www.climber.se/vad-vi-gor/erbjudanden/migrera-till-qlik-cloud-analytics/	Varför byta till Qlik Cloud Analytics?	https://www.youtube.com/watch?v=bxNO32APx4s
https://www.climber.se/produkter/financial-planning-analysis/planacy/	Planacy | Climber	https://www.youtube.com/watch?v=vAURqHIipYI
https://www.climber.se/produkter/data-platform/qlik-cloud-data-integration/	Qlik Cloud Data Integration | Real-Time Data Integration Simplified	https://youtu.be/VDSoRA8yKmg	https://youtu.be/pnOTENP6yEs
https://www.climber.se/produkter/data-platform/snowflake-ai-data-cloud/	Snowflake AI Data Cloud | Climber	https://www.youtube.com/watch?v=tb_ikMu-cLU	https://www.youtube.com/watch?v=y0oZrJHa80c
https://www.climberbi.co.uk/data-literacy-and-training/	Data Literacy & Training - Climber BI	https://youtu.be/o-6XRM33uH8	https://youtu.be/oUB9evQq7V8
https://www.climber.se/produkter/data-platform/microsoft-data-integration/	Microsoft Fabric - Data Integration	https://youtu.be/WmMa_aPlPCA?si=zDvR1H6om0GKGZIm
https://www.climber.se/produkter/data-analytics-verktyg/qlik-cloud-analytics/	Qlik Cloud Analytics | Augmented Analytics with AI & ML	https://youtu.be/bxNO32APx4s
https://www.climber.se/produkter/data-analytics-verktyg/microsoft-power-bi/	Microsoft Power BI « Transform Data into Actionable Insights	https://www.youtube.com/watch?v=yKTSLffVGbk
https://www.climber.nl/onze-diensten/software/snowflake-ai-data-cloud/	Snowflake AI Data Cloud | Climber	https://www.youtube.com/watch?v=tb_ikMu-cLU	https://www.youtube.com/watch?v=y0oZrJHa80c
https://www.climber.nl/onze-diensten/software/qlik-talend-data-integration/	Qlik Talend Data Integration | Climber	https://youtu.be/VDSoRA8yKmg	https://youtu.be/pnOTENP6yEs
https://www.climber.nl/onze-diensten/software/qlik-cloud-analytics/	Qlik Cloud Analytics | Data-Driven Insights	https://youtu.be/bxNO32APx4s
https://www.climber.nl/onze-diensten/services/data-analytics/	Data Analytics | Climber
https://www.climber.nl/onze-diensten/software/microsoft-power-bi/	Microsoft Power BI - Transform Data Into Actionable Insights	https://www.youtube.com/watch?v=yKTSLffVGbk
https://www.climber.nl/onze-diensten/software/microsoft-fabric/	Microsoft Fabric | Climber	https://youtu.be/WmMa_aPlPCA?si=zDvR1H6om0GKGZIm
https://www.climber.nl/onze-diensten/onze-cases/logistiek/	Climber, de Data Partner voor logistieke bedrijven
https://www.climber.nl/move-to-qlik-cloud/	Move to Qlik Cloud	https://youtu.be/bxNO32APx4s
https://www.climber.fi/tarjontamme/tyokalumme/qlik-talend-data-integration/	Qlik Talend Data Integration | Climber	https://youtu.be/VDSoRA8yKmg	https://youtu.be/pnOTENP6yEs
https://www.climber.fi/tarjontamme/tyokalumme/snowflake-ai-data-cloud/	Snowflake AI Data Cloud | Climber	https://www.youtube.com/watch?v=tb_ikMu-cLU	https://www.youtube.com/watch?v=y0oZrJHa80c
https://www.climber.fi/tarjontamme/tyokalumme/qlik-cloud-analytics/	Qlik Cloud Analytics: Data-Driven Decisions Made Easy	https://youtu.be/bxNO32APx4s
https://www.climber.fi/tarjontamme/tyokalumme/microsoft-power-bi/	Microsoft Power BI - Transform Data Into Actionable Insights	https://www.youtube.com/watch?v=yKTSLffVGbk
https://www.climber.fi/tarjontamme/tyokalumme/microsoft-fabric/	Microsoft Fabric | Climber	https://youtu.be/WmMa_aPlPCA?si=zDvR1H6om0GKGZIm
https://www.climber.fi/tarjontamme/palvelut/valmiina-tekoalyyn/	Valmiina tekoälyyn | Climber
https://www.climber.fi/tarjontamme/palvelut/datastrategia/	Datastrategia | Climber
https://www.climber.fi/tarjontamme/palvelut/data-analytiikka/	Data-analytiikka | Climber
https://www.climber.fi/move-to-qlik-cloud/	Move to Qlik Cloud	https://youtu.be/bxNO32APx4s
https://www.climber.nl/onze-diensten/services/training/	Data Literacy & Training	https://youtu.be/oUB9evQq7V8	https://youtu.be/o-6XRM33uH8
https://www.climber.nl/onze-diensten/services/ai-ready/	AI-ready | Climber
https://www.climber.nl/onze-diensten/services/data-strategie/	Data Strategie | Climber
https://www.climberbi.co.uk/data-strategy/	Data Strategy | Climber
https://www.climberbi.co.uk/solution-development/	Solution Development | Climber
https://www.climberbi.co.uk/ai-readiness/	AI-readiness | Climber
`;

async function main() {
  const db = await getDb();
  const videosColl = db.collection(process.env.COLLECTION_VIDEOS ?? "ggads_videos");
  const linksColl = db.collection(process.env.COLLECTION_VIDEO_PAGE_LINKS ?? "ggads_page_video_links");

  // Parse data
  const lines = DATA.trim().split("\n");
  console.log(`Parsing ${lines.length} rows...`);

  const videoMap = new Map<string, { videoId: string; url: string; sourcePages: Set<string>; domains: Set<string> }>();
  const pageMap = new Map<string, Set<string>>(); // pageUrl → videoUrls

  let rowsWithVideo = 0;
  let totalVideos = 0;

  for (const line of lines) {
    const cols = line.trim().split("\t");
    if (cols.length < 3) continue;

    const pageUrl = cols[0]?.trim();
    const video1 = cols[2]?.trim();
    const video2 = cols[3]?.trim();

    if (!pageUrl) continue;

    const videos: string[] = [];
    if (video1) videos.push(video1);
    if (video2) videos.push(video2);

    if (videos.length === 0) continue;
    rowsWithVideo++;

    const domain = deriveDomain(pageUrl);

    // Track page → videos for page_video_links
    if (!pageMap.has(pageUrl)) pageMap.set(pageUrl, new Set());
    const pageVideos = pageMap.get(pageUrl)!;

    for (const videoUrl of videos) {
      const videoId = extractYouTubeId(videoUrl);
      if (!videoId) {
        console.warn(`  WARN: Could not extract video ID from: ${videoUrl}`);
        continue;
      }

      pageVideos.add(videoUrl);
      totalVideos++;

      const existing = videoMap.get(videoId);
      if (existing) {
        existing.sourcePages.add(pageUrl);
        if (domain) existing.domains.add(domain);
      } else {
        videoMap.set(videoId, {
          videoId,
          url: videoUrl,
          sourcePages: new Set([pageUrl]),
          domains: new Set(domain ? [domain] : []),
        });
      }
    }
  }

  console.log(`  ${rowsWithVideo} rows with videos, ${totalVideos} total video references, ${videoMap.size} unique videos`);

  // Upsert videos into ggads_videos
  let upserted = 0;
  for (const [, v] of videoMap) {
    const domains = Array.from(v.domains);
    const sourcePages = Array.from(v.sourcePages);
    await videosColl.updateOne(
      { videoId: v.videoId },
      {
        $set: {
          videoId: v.videoId,
          url: v.url,
          thumbnailUrl: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          channelName: "Climber",
          domains,
          sourcePages,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    upserted++;
  }
  console.log(`  ${upserted} videos upserted into ${process.env.COLLECTION_VIDEOS ?? "ggads_videos"}`);

  // Upsert page→video links into ggads_page_video_links
  let linked = 0;
  for (const [pageUrl, videoUrls] of pageMap) {
    await linksColl.updateOne(
      { pageUrl },
      {
        $set: {
          pageUrl,
          videoUrls: Array.from(videoUrls),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    linked++;
  }
  console.log(`  ${linked} pages linked in ${process.env.COLLECTION_VIDEO_PAGE_LINKS ?? "ggads_page_video_links"}`);

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
