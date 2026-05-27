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
    const queryDomain = searchParams.get("domain");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const skip = (page - 1) * limit;

    // Clients can only see images matching their own domain
    const filterDomain = authUser.role === "client" && authUser.domain
      ? authUser.domain
      : queryDomain;

    const db = await getDb();
    const filter: any = {};

    if (filterDomain) {
      filter.url = { $regex: filterDomain, $options: "i" };
    }
    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$and = filter.$and || [];
      (filter.$and as any[]).push({
        $or: [
          { url: regex },
          { asset_url: regex },
          { keywords: regex },
          { desc: regex },
          { category: regex },
          { altText: regex },
          { source_page: regex },
        ],
      });
    }
    const imagesColl = db.collection(
      process.env.COLLECTION_ALL_IMAGES ?? "ggads_all_images"
    );

    // Page images: look up from image_page_links + page_image_assignments, then
    // merge with all_images metadata. URLs not yet in all_images (common for
    // non-.se domains) are returned as direct entries so the picker still works.
    if (pageUrl) {
      const linksColl = db.collection(
        process.env.COLLECTION_IMAGE_PAGE_LINKS ?? "ggads_image_page_links"
      );
      const assignColl = db.collection(
        process.env.COLLECTION_PAGE_IMAGE_ASSIGNMENTS ?? "ggads_page_image_assignments"
      );
      const variants = [pageUrl, pageUrl.replace(/\/$/, ""), pageUrl + (pageUrl.endsWith("/") ? "" : "/")];
      const links = await linksColl.find({ pageUrl: { $in: variants } }).limit(50).toArray();
      const assigned = await assignColl.findOne({ pageUrl: { $in: variants } });

      const pageImageUrls = links.map((l: any) => l.imageUrl).filter(Boolean);
      const assignedUrls = (assigned?.images || []).map((img: any) => img.url || img.asset_url || img).filter(Boolean);
      const allPageUrls = [...new Set([...pageImageUrls, ...assignedUrls])];

      if (allPageUrls.length > 0) {
        // Find matching entries in all_images for metadata enrichment
        const existing = await imagesColl.find({
          $or: [
            { url: { $in: allPageUrls } },
            { asset_url: { $in: allPageUrls } },
          ],
        }).toArray();
        const existingUrls = new Set(existing.map((img: any) => img.url || img.asset_url));

        // URLs not yet in all_images — return as direct entries
        const directImages = allPageUrls
          .filter((u) => !existingUrls.has(u))
          .map((u, i) => ({
            _id: `page-${i}`,
            url: u,
            type: "image",
            source_page: pageUrl,
          }));

        const normalized = existing.map((img: any) => ({
          _id: img._id,
          url: img.url || img.asset_url,
          asset_url: img.asset_url,
          type: img.type,
          category: img.category,
          desc: img.desc,
          keywords: img.keywords,
          width: img.dimensions?.width,
          height: img.dimensions?.height,
          source_page: img.source_page,
        }));

        // Apply search filter on the merged set if provided
        let merged = [...normalized, ...directImages];
        if (search) {
          const q = search.toLowerCase();
          merged = merged.filter((img: any) =>
            (img.url || "").toLowerCase().includes(q) ||
            (img.desc || "").toLowerCase().includes(q) ||
            (img.category || "").toLowerCase().includes(q) ||
            (img.keywords || []).some((k: string) => k.toLowerCase().includes(q))
          );
        }

        return NextResponse.json({ images: merged, total: merged.length });
      }

      // Page has no images — return empty
      return NextResponse.json({ images: [], total: 0 });
    }

    const [images, total] = await Promise.all([
      imagesColl.find(filter).skip(skip).limit(limit).toArray(),
      imagesColl.countDocuments(filter),
    ]);

    // Normalize: extract display URL
    const result = images.map((img: any) => ({
      _id: img._id,
      url: img.url || img.asset_url,
      asset_url: img.asset_url,
      type: img.type,
      category: img.category,
      desc: img.desc,
      keywords: img.keywords,
      width: img.dimensions?.width,
      height: img.dimensions?.height,
      source_page: img.source_page,
    }));

    return NextResponse.json({ images: result, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, images: [] }, { status: 500 });
  }
}
