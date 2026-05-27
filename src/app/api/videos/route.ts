import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get("pageUrl");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;

    const db = await getDb();
    const videosColl = db.collection(process.env.COLLECTION_VIDEOS ?? "ggads_videos");
    const linksColl = db.collection(process.env.COLLECTION_VIDEO_PAGE_LINKS ?? "ggads_page_video_links");

    // Mode A — page-scoped videos
    if (pageUrl) {
      const variants = [pageUrl, pageUrl.replace(/\/$/, ""), pageUrl.endsWith("/") ? pageUrl : pageUrl + "/"];
      const link = await linksColl.findOne({ pageUrl: { $in: variants } });
      const pageVideoUrls: string[] = link?.videoUrls || [];

      if (pageVideoUrls.length > 0) {
        const existing = await videosColl.find({
          url: { $in: pageVideoUrls },
        }).toArray();

        const existingUrls = new Set(existing.map((v: any) => v.url));

        // URLs not yet in master catalog
        const directVideos = pageVideoUrls
          .filter((u) => !existingUrls.has(u))
          .map((u, i) => {
            const videoId = extractVideoId(u);
            return {
              _id: `page-vid-${i}`,
              videoId: videoId || "",
              url: u,
              thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "",
            };
          });

        const normalized = existing.map((v: any) => ({
          _id: v._id,
          videoId: v.videoId,
          url: v.url,
          thumbnailUrl: v.thumbnailUrl || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
          channelName: v.channelName,
          domains: v.domains || [],
        }));

        let merged = [...normalized, ...directVideos];
        if (search) {
          const q = search.toLowerCase();
          merged = merged.filter((v: any) =>
            (v.videoId || "").toLowerCase().includes(q) ||
            (v.url || "").toLowerCase().includes(q) ||
            (v.channelName || "").toLowerCase().includes(q)
          );
        }

        return NextResponse.json({ videos: merged, total: merged.length });
      }

      return NextResponse.json({ videos: [], total: 0 });
    }

    // Mode B — all videos with optional search + pagination
    const filter: any = {};

    // Client users auto-scoped to their domain
    if (authUser.role === "client" && authUser.domain) {
      filter.domains = authUser.domain;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { videoId: regex },
        { url: regex },
        { channelName: regex },
      ];
    }

    const [videos, total] = await Promise.all([
      videosColl.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
      videosColl.countDocuments(filter),
    ]);

    const result = videos.map((v: any) => ({
      _id: v._id,
      videoId: v.videoId,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      channelName: v.channelName,
      domains: v.domains || [],
    }));

    return NextResponse.json({
      videos: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, videos: [] }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.replace(/^\//, "");
  } catch {}
  return null;
}
