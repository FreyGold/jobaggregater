// ─── User Types ──────────────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  currentPeriodEnd?: string;
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  interval: 'month';
  features: string[];
  limits: {
    jobResultsPerPage: number | null; // null = unlimited
    savedJobs: number | null;
    rateLimit: number;
  };
}

export interface UserCreateInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TailoredResume {
  id: string;
  resumeId: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl?: string;
  score: number;
  tailoredContent: string;
  createdAt: string;
}

export interface TailorResumeInput {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl?: string;
}
