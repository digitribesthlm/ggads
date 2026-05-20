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

    // Clients can only see images matching their own domain
    const filterDomain = authUser.role === "client" && authUser.domain
      ? authUser.domain
      : queryDomain;

    const db = await getDb();
    const filter: any = {};

    if (filterDomain) {
      filter.url = { $regex: filterDomain, $options: "i" };
    }
    if (pageUrl) {
      // Also check image_page_links for the page
      const linksColl = db.collection(
        process.env.COLLECTION_IMAGE_PAGE_LINKS ?? "ggads_image_page_links"
      );
      const variants = [pageUrl, pageUrl.replace(/\/$/, ""), pageUrl + (pageUrl.endsWith("/") ? "" : "/")];
      const links = await linksColl.find({ pageUrl: { $in: variants } }).limit(50).toArray();
      const imageUrls = links.map((l: any) => l.imageUrl).filter(Boolean);

      // Also get assigned images for this page
      const assignColl = db.collection(
        process.env.COLLECTION_PAGE_IMAGE_ASSIGNMENTS ?? "ggads_page_image_assignments"
      );
      const assigned = await assignColl.findOne({ pageUrl: { $in: variants } });
      const assignedUrls = (assigned?.images || []).map((img: any) => img.url || img.asset_url).filter(Boolean);

      // Combine: page images + assigned images
      const allUrls = [...new Set([...imageUrls, ...assignedUrls])];
      if (allUrls.length > 0) {
        filter.$or = [
          { url: { $in: allUrls } },
          { asset_url: { $in: allUrls } },
        ];
      }
    }

    const imagesColl = db.collection(
      process.env.COLLECTION_ALL_IMAGES ?? "ggads_all_images"
    );
    const images = await imagesColl.find(filter).limit(100).toArray();

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

    return NextResponse.json({ images: result, total: result.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, images: [] }, { status: 500 });
  }
}
