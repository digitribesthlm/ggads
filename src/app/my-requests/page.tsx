"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCampaigns } from "@/lib/use-campaigns";
import Link from "next/link";

export default function MyRequestsPage() {
  const { user, isAccountManager } = useAuth();
  const router = useRouter();
  const { campaigns } = useCampaigns();
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) router.replace("/");
    if (user && isAccountManager) router.replace("/review");
    fetch("/api/creative-requests")
      .then((r) => r.json())
      .then((data) => setMyRequests(
        (data || []).filter((r: any) => r.submittedBy === user?.email)
      ))
      .catch(() => {});
  }, [user, isAccountManager, router]);

  if (!user || isAccountManager) return null;

  const getCampaignName = (campaignId: string) => {
    const c = campaigns.find((c: any) => c.campaignName === campaignId);
    return c?.campaignName ?? campaignId ?? "Unknown";
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "pending_review":
        return "bg-orange-100 text-orange-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Requests</h1>
      <p className="text-sm text-gray-500 mb-8">
        Track the status of your creative change requests.
      </p>

      {myRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-3xl mb-3 text-gray-300">&#9998;</div>
          <p className="text-sm text-gray-500 mb-4">
            You haven&apos;t submitted any change requests yet.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors"
          >
            Go to Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myRequests.map((req) => {
            const changedFields: string[] = [];
            if (req.headlines?.length)
              changedFields.push(
                `${req.headlines.length} headlines`
              );
            if (req.descriptions?.length)
              changedFields.push(
                `${req.descriptions.length} descriptions`
              );
            if (req.landingPageUrl) changedFields.push("landing page");
            if (req.imageUrls.length > 0)
              changedFields.push(`${req.imageUrls.length} images`);
            if (req.youtubeUrls?.length) changedFields.push(`${req.youtubeUrls.length} YouTube URLs`);

            return (
              <div
                key={req._id || req.id}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      Request #{req.id}
                    </div>
                    <div className="text-xs text-gray-500">
                      Campaign: {getCampaignName(req.campaignId)}
                    </div>
                  </div>
                  <span
                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${statusStyle(req.status)}`}
                  >
                    {req.status === "pending_review"
                      ? "Pending"
                      : req.status === "approved"
                        ? "Done"
                        : req.status === "rejected"
                          ? "Changes Needed"
                          : "Draft"}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Submitted{" "}
                  {new Date(req.submittedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  Changed: {changedFields.join(", ")}
                </div>
                {req.status === "rejected" && req.rejectionReason && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                    <strong>Note:</strong> {req.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
