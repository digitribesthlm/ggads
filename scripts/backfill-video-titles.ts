// Backfill video titles from YouTube oEmbed (free, no API key needed)
import { getDb } from "../src/lib/mongodb";

async function main() {
  const db = await getDb();
  const coll = db.collection(process.env.COLLECTION_VIDEOS ?? "ggads_videos");
  const videos = await coll.find({}).toArray();

  console.log(`Fetching titles for ${videos.length} videos...`);

  let updated = 0;
  for (const v of videos) {
    const url = v.url;
    if (!url) continue;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    try {
      const res = await fetch(oembedUrl);
      if (!res.ok) {
        console.warn(`  WARN: ${v.videoId} → HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const title = data.title || "";
      if (title) {
        await coll.updateOne(
          { _id: v._id },
          { $set: { title, updatedAt: new Date() } }
        );
        console.log(`  ${v.videoId} → "${title}"`);
        updated++;
      }
    } catch (e) {
      console.warn(`  WARN: ${v.videoId} → ${(e as Error).message}`);
    }
  }

  console.log(`Done. ${updated}/${videos.length} titles updated.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
