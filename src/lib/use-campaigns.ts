"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Campaign, ImportedCampaign } from "@/lib/types";

// Cache keyed by domain so switching users refreshes correctly
const cache = new Map<string, ImportedCampaign[]>();

export function useCampaigns() {
  const { user } = useAuth();
  const userDomain = user?.domain || null;
  const [campaigns, setCampaigns] = useState<ImportedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't fetch until we have a user with a domain
    if (!user || !userDomain) {
      setLoading(true);
      return;
    }

    // Return cached data immediately if available
    if (cache.has(userDomain)) {
      setCampaigns(cache.get(userDomain)!);
      setLoading(false);
      fetchedRef.current = userDomain;
      return;
    }

    // Prevent duplicate fetches
    if (fetchedRef.current === userDomain) return;
    fetchedRef.current = userDomain;

    setLoading(true);
    fetch(`/api/campaigns/${userDomain}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.campaigns || [];
        cache.set(userDomain, list);
        setCampaigns(list);
      })
      .catch((err) => {
        console.error("Failed to fetch campaigns:", err);
      })
      .finally(() => setLoading(false));
  }, [user, userDomain]);

  return { campaigns, loading, domain: userDomain || ".se" };
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
