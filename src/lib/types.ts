export type CampaignType = "search" | "pmax";

export type CampaignStatus = "active" | "paused";

export type RequestStatus = "draft" | "pending_review" | "approved" | "rejected";

export type UserRole = "account_manager" | "client";

export const DOMAINS = [".se", ".fi", ".nl", ".uk"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  domain?: Domain;
  company?: string;
  inviteSentAt?: string;
  lastLoginAt?: string;
  loginCount: number;
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  domain: Domain;
  // Current live creative
  headlines: string[];
  descriptions: string[];
  landingPageUrl: string;
  imageUrls: string[];
  youtubeUrls: string[];
  updatedAt: string;
}

export interface CreativeRequest {
  id: string;
  campaignId: string;
  clientId: string;
  // Proposed state — each position has an ID and text. IDs match the live asset group's headlineIds/descriptionIds.
  // Missing IDs (present in live but not in the request) = removed. Empty IDs = new headlines/descriptions.
  headlineIds: string[];
  headlines: string[];
  descriptionIds: string[];
  descriptions: string[];
  landingPageUrl: string;
  imageUrls: string[];
  youtubeUrls: string[];
  status: RequestStatus;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface ChangeLogEntry {
  id: string;
  requestId: string;
  campaignId: string;
  campaignName: string;
  actor: string;
  actorEmail: string;
  action: "submitted" | "done" | "changes_needed";
  timestamp: string;
  summary: string;
}

// ---- CSV Import Types ----

export interface ImportedCampaign {
  accountId: string;
  accountName: string;
  campaignName: string;
  domain: Domain;
  type: CampaignType;
  labels: string[];
  adGroups: ImportedAdGroup[];
}

export interface ImportedAdGroup {
  name: string;
  labels: string[];
  assetGroups: ImportedAssetGroup[];
}

export interface ImportedAssetGroup {
  id?: string;
  name: string;
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];
  callToAction: string;
  businessName: string;
  finalUrl: string;
  path1: string;
  path2: string;
  youtubeUrls: string[];
  status: string;
  approvalStatus: string;
  adStrength: string;
}
