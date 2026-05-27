import { extractDomain } from "./domains";
import type {
  ImportedCampaign,
  ImportedAdGroup,
  ImportedAssetGroup,
  Domain,
  CampaignType,
} from "./types";

function makeSlug(...parts: string[]): string {
  return parts
    .map((p) =>
      p
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
    .join("__");
}

interface ColumnMap {
  account: number;
  accountName: number;
  campaignOriginal: number;
  campaign: number;
  labels: number;
  campaignType: number;
  adGroup: number;
  assetGroup: number;
  headlines: number[];
  longHeadlines: number[];
  descriptions: number[];
  callToAction: number;
  businessName: number;
  path1: number;
  path2: number;
  finalUrl: number;
  campaignStatus: number;
  adGroupStatus: number;
  assetGroupStatus: number;
  status: number;
  approvalStatus: number;
  adStrength: number;
  videoIds: number[];
}

function buildColumnMap(headers: string[]): ColumnMap {
  const find = (name: string): number => {
    const i = headers.findIndex((h) => h.trim() === name);
    if (i === -1) throw new Error(`Column not found: "${name}"`);
    return i;
  };

  return {
    account: find("Account"),
    accountName: find("Account name"),
    campaignOriginal: find("Campaign#Original"),
    campaign: find("Campaign"),
    labels: find("Labels"),
    campaignType: find("Campaign Type"),
    adGroup: find("Ad Group"),
    assetGroup: find("Asset Group"),
    headlines: Array.from({ length: 15 }, (_, i) => find(`Headline ${i + 1}`)),
    longHeadlines: Array.from({ length: 5 }, (_, i) => find(`Long headline ${i + 1}`)),
    descriptions: Array.from({ length: 5 }, (_, i) => find(`Description ${i + 1}`)),
    callToAction: find("Call to action"),
    businessName: find("Business name"),
    path1: find("Path 1"),
    path2: find("Path 2"),
    finalUrl: find("Final URL"),
    campaignStatus: find("Campaign Status"),
    adGroupStatus: find("Ad Group Status"),
    assetGroupStatus: find("Asset Group Status"),
    status: find("Status"),
    videoIds: Array.from({ length: 15 }, (_, i) => {
      const idx = headers.findIndex((h) => h.trim() === `Video ID ${i + 1}`);
      return idx === -1 ? -1 : idx;
    }),
    approvalStatus: find("Approval Status"),
    adStrength: find("Ad strength"),
  };
}

function clean(val: string): string {
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function getNonEmpty(cols: number[], row: string[]): string[] {
  return cols.map((i) => clean(row[i] ?? "")).filter(Boolean);
}

function pick(col: number, row: string[]): string {
  return clean(row[col] ?? "");
}

function parseCampaignType(raw: string): CampaignType {
  const lower = raw.toLowerCase();
  if (lower.includes("performance max")) return "pmax";
  return "search";
}

export function parseGoogleAdsCsv(csvText: string): ImportedCampaign[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  const cols = buildColumnMap(headers);

  const campaigns: ImportedCampaign[] = [];
  let currentCampaign: ImportedCampaign | null = null;
  let currentAdGroup: ImportedAdGroup | null = null;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split("\t");
    if (row.length < 2) continue;

    // Detect new campaign — only set on the first row of each campaign in exports.
    const isNewCampaign = pick(cols.campaignOriginal, row);

    if (isNewCampaign) {
      const campaignName = pick(cols.campaign, row);
      const domain = extractDomain(campaignName);
      if (!domain) continue;

      // Deduplicate — same campaign name is a continuation of existing
      const existing = campaigns.find((c) => c.campaignName === campaignName);
      if (existing) {
        currentCampaign = existing;
        currentAdGroup = null;
        continue;
      }

      const accountId = pick(cols.account, row);
      const accountName = pick(cols.accountName, row);
      const type = parseCampaignType(pick(cols.campaignType, row));
      const labels = pick(cols.labels, row)
        .split(";")
        .map((l) => l.trim())
        .filter(Boolean);

      currentCampaign = {
        accountId,
        accountName,
        campaignName,
        domain,
        type,
        labels,
        adGroups: [],
      };
      campaigns.push(currentCampaign);
      currentAdGroup = null;
      continue;
    }

    if (!currentCampaign) continue;

    const adGroupName = pick(cols.adGroup, row);

    // New ad group
    if (adGroupName && (currentAdGroup as any)?.name !== adGroupName) {
      const adLabels = pick(cols.labels, row)
        .split(";")
        .map((l) => l.trim())
        .filter(Boolean);

      currentAdGroup = {
        name: adGroupName,
        labels: adLabels,
        assetGroups: [],
      };
      currentCampaign.adGroups.push(currentAdGroup);
    }

    const assetGroupName = pick(cols.assetGroup, row);
    const headlines = getNonEmpty(cols.headlines, row);
    const longHeadlines = getNonEmpty(cols.longHeadlines, row);
    const descriptions = getNonEmpty(cols.descriptions, row);
    const youtubeUrls = getNonEmpty(cols.videoIds, row)
      .map((id) => `https://www.youtube.com/watch?v=${id}`);

    const hasCreative = headlines.length > 0 || longHeadlines.length > 0 || descriptions.length > 0;

    // PMAX: create asset group only if it has a name + creative content
    if (assetGroupName && hasCreative) {
      if (!adGroupName) {
        currentAdGroup = {
          name: assetGroupName,
          labels: [],
          assetGroups: [],
        };
        currentCampaign.adGroups.push(currentAdGroup);
      }

      const id = (currentCampaign?.campaignName && assetGroupName)
        ? makeSlug(currentCampaign.campaignName, assetGroupName)
        : undefined;

      const ag = currentAdGroup!;
      const existing = ag.assetGroups.find((ag) => ag.name === assetGroupName);
      if (!existing) {
        ag.assetGroups.push({
          name: assetGroupName,
          headlines,
          longHeadlines,
          descriptions,
          youtubeUrls,
          callToAction: pick(cols.callToAction, row),
          businessName: pick(cols.businessName, row),
          finalUrl: pick(cols.finalUrl, row),
          path1: pick(cols.path1, row),
          path2: pick(cols.path2, row),
          status: pick(cols.status, row),
          approvalStatus: pick(cols.approvalStatus, row),
          adStrength: pick(cols.adStrength, row),
          ...(id ? { id } as any : {}),
        });
      }
    }

    // Search campaigns: creative content is in RSA rows with no asset group name.
    // Wrap in a synthetic asset group so headlines/descriptions/URLs are preserved.
    if (!assetGroupName && hasCreative && currentCampaign?.type === "search" && currentAdGroup) {
      const syntheticName = currentAdGroup.name || currentCampaign.campaignName;
      const id = makeSlug(currentCampaign.campaignName, syntheticName);
      const existing = currentAdGroup.assetGroups.find((ag) => ag.name === syntheticName);
      if (!existing) {
        currentAdGroup.assetGroups.push({
          name: syntheticName,
          headlines,
          longHeadlines,
          descriptions,
          youtubeUrls,
          callToAction: pick(cols.callToAction, row),
          businessName: pick(cols.businessName, row),
          finalUrl: pick(cols.finalUrl, row),
          path1: pick(cols.path1, row),
          path2: pick(cols.path2, row),
          status: pick(cols.status, row),
          approvalStatus: pick(cols.approvalStatus, row),
          adStrength: pick(cols.adStrength, row),
          ...({ id } as any),
        });
      }
    }
  }

  return campaigns;
}
