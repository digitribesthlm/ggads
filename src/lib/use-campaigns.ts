"use client";

import { useState, useEffect } from "react";
import type { Campaign, ImportedCampaign } from "@/lib/types";

let cached: ImportedCampaign[] | null = null;

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<ImportedCampaign[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    fetch("/api/campaigns/se")
      .then((res) => res.json())
      .then((data) => {
        cached = data.campaigns || [];
        setCampaigns(cached!);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { campaigns, loading };
}

/** Find one asset group by its composite ID (campaignName__assetGroupName) */
export function findAssetGroup(campaigns: ImportedCampaign[], assetGroupId: string) {
  for (const c of campaigns) {
    for (const ag of c.adGroups) {
      for (const asg of ag.assetGroups) {
        if (`${c.campaignName}__${asg.name}` === assetGroupId) {
          return { campaign: c, adGroup: ag, assetGroup: asg };
        }
      }
    }
  }
  return null;
}
