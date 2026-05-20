import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser || authUser.role !== "account_manager") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { pageUrl, imageUrls } = await request.json();
    if (!pageUrl || !imageUrls) {
      return NextResponse.json({ error: "pageUrl and imageUrls required" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection(
      process.env.COLLECTION_PAGE_IMAGE_ASSIGNMENTS ?? "ggads_page_image_assignments"
    );

    // Fetch image metadata from all_images
    const imagesColl = db.collection(
      process.env.COLLECTION_ALL_IMAGES ?? "ggads_all_images"
    );
    const imageDocs = await imagesColl.find({ url: { $in: imageUrls } }).toArray();
    const assetDocs = await imagesColl.find({ asset_url: { $in: imageUrls } }).toArray();
    const allImageData = [...imageDocs, ...assetDocs];

    const images = imageUrls.map((url: string) => {
      const data = allImageData.find((d: any) => d.url === url || d.asset_url === url);
      return {
        url: data?.url || url,
        asset_url: data?.asset_url,
        category: data?.category,
        desc: data?.desc,
        width: data?.dimensions?.width,
        height: data?.dimensions?.height,
        addedAt: new Date(),
      };
    });

    await coll.updateOne(
      { pageUrl },
      { $set: { images, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, count: images.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
