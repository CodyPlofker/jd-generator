// GTM (Go-To-Market) Workflow Types

export type LaunchTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';

export type LaunchStatus = 'draft' | 'brief-review' | 'strategy-review' | 'generating' | 'complete';

// Channel types - matching integrated marketing plan structure
export type ChannelId =
  | 'retention'       // Email + SMS + Direct Mail + Popup + Flows
  | 'creative'        // Creative concepts for paid
  | 'paid-media'      // Channel allocation and targeting
  | 'organic-social'  // Instagram, TikTok, YouTube
  | 'influencer'      // Creator partnerships
  | 'ecom'            // Site placements
  | 'pr-affiliate'    // PR and Affiliate
  | 'retail';         // Retail activations

export interface GTMLaunch {
  id: string;
  name: string;
  product: string;
  launchDate: string;
  tier: LaunchTier;
  status: LaunchStatus;
  createdAt: string;
  updatedAt: string;

  // Step 1 outputs
  rawNotes?: string;
  pmc?: PMCDocument;
  creativeBrief?: CreativeBrief;

  // Step 2 outputs - multi-channel strategy
  selectedChannels?: ChannelId[];
  channelStrategies?: ChannelStrategies;

  // Step 3 outputs - multi-channel deliverables
  channelDeliverables?: ChannelDeliverables;
}

// ============================================
// CHANNEL STRATEGIES (Step 2 output)
// These are STRATEGIC PLANS, not briefs
// ============================================

export interface ChannelStrategies {
  retention?: RetentionStrategy;
  creative?: CreativeStrategy;
  paidMedia?: PaidMediaStrategy;
  organicSocial?: OrganicSocialStrategy;
  influencer?: InfluencerStrategy;
  ecom?: EcomStrategy;
  prAffiliate?: PRAffiliateStrategy;
  retail?: RetailStrategy;
}

// ============================================
// RETENTION STRATEGY (Email + SMS + DM)
// ============================================

export type EmailType =
  | 'gtl'                // Get the Look - Tutorial
  | 'plain-text'         // Letter-style personal note
  | 'product-spotlight'  // Hero product deep dive
  | 'product-roundup'    // Theme-based collection
  | 'back-in-stock'      // Restocked item announcement
  | 'launch'             // New product launch
  | 'teaser'             // Pre-launch anticipation
  | 'retail-event'       // IRL event/pop-up
  | 'promotional'        // GWP, sale, promo
  | 'set-kit'            // Bundled set/kit
  | 'how-to'             // Problem/solution tutorial
  | 'duos'               // Product pairings
  | 'shade-roundup'      // Shade range showcase
  | 'product-tutorial'   // How to use specific product
  | 'social-proof';      // Reviews/press quotes

export type SMSType = 'launch' | 'reminder' | 'last-chance' | 'social-proof';

export type EmailAudience = 'prospects' | 'repeat' | 'vip' | 'all';

export interface RetentionStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Email items for the calendar
  emailItems: RetentionEmailItem[];

  // SMS items for the calendar
  smsItems: RetentionSMSItem[];

  // Other retention elements
  directMail?: {
    enabled: boolean;
    budget?: string;
    description: string;
  };

  popup?: {
    enabled: boolean;
    description: string;
  };

  flows?: {
    dedicatedFlow: boolean;
    universalFooter: boolean;
    description?: string;
  };
}

export interface RetentionEmailItem {
  id: string;
  type: EmailType;
  name: string;
  timing: string;        // e.g., "D-3", "Launch Day", "D+1"
  audience: EmailAudience;
  description: string;   // Brief description of purpose
}

export interface RetentionSMSItem {
  id: string;
  type: SMSType;
  name: string;
  timing: string;
  description: string;
}

// ============================================
// CREATIVE STRATEGY (Paid Creative Concepts)
// ============================================

// Per-persona insight from Phase 1 research
export interface PersonaInsight {
  personaId: PersonaId;
  personaName: string;
  customerBasePercentage: number;

  // How this product maps to this persona
  productFit: {
    relevanceScore: 'high' | 'medium' | 'low';
    primaryJobsToBeDone: string[];       // Which JTBD this product solves
    emotionalBenefits: string[];         // How this makes them FEEL
    functionalBenefits: string[];        // What it DOES for them
  };

  // Messaging specific to this persona
  messagingAngles: {
    angle: string;
    hookFormula: 'problem-first' | 'identity-first' | 'contrarian' | 'direct-benefit';
    whyItWorks: string;
  }[];

  // Hook opportunities
  hookOpportunities: {
    hook: string;
    voiceOfCustomerSource?: string;      // Optional VOC quote that inspired this
  }[];

  // Potential objections for this persona
  objections: string[];

  // Recommended concept count for this persona (AI determined)
  recommendedConceptCount: number;
}

// Phase 1 output - Creative Research/Insights
export interface CreativeResearch {
  status: 'draft' | 'approved';
  generatedAt: string;

  // Overall product-market analysis
  productSummary: {
    keyDifferentiator: string;
    primaryBenefit: string;
    categoryPosition: string;
  };

  // Per-persona insights
  personaInsights: PersonaInsight[];

  // General audience insights (non-persona-specific)
  generalAudienceInsights: {
    universalHooks: string[];
    broadAppealAngles: string[];
  };

  // Recommended total concepts by tier
  recommendedTotalConcepts: number;
}

export interface CreativeStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Phase 1 research (NEW - persona insights before concepts)
  research?: CreativeResearch;

  // Track current phase in 3-phase workflow
  currentPhase: 'research' | 'strategy' | 'concepts';

  // Concept list (Phase 3)
  concepts: CreativeConcept[];

  // Format mix - NOW COUNTS not percentages (calculated from concepts)
  formatMix: {
    static: number;   // Actual count of static assets
    video: number;    // Actual count of video assets
    carousel: number; // Actual count of carousel assets
  };

  // UGC creators (tier 1-2 only)
  ugcCreators?: {
    count: number;
    tiers: { micro: number; mid: number; macro: number };
  };

  // Visual direction notes
  visualDirection: string;

  // Partnership ads focus (tier 1-2 only)
  partnershipFocus?: 'heavy' | 'moderate' | 'none';
}

// Persona IDs for creative strategy
export type PersonaId =
  | 'dedicated-educator'
  | 'ageless-matriarch'
  | 'high-powered-executive'
  | 'wellness-healthcare-practitioner'
  | 'busy-suburban-supermom'
  | 'creative-entrepreneur';

export interface CreativeConcept {
  id: string;
  name: string;
  hookFormula: 'problem-first' | 'identity-first' | 'contrarian' | 'direct-benefit';
  angle: string;
  targetPersona: PersonaId | 'general';  // Required - which persona this concept targets
  personaName?: string;                   // Display name for the persona
  formats: ('static' | 'video' | 'carousel')[];
  primaryHook?: string;                   // Hook text from research
  sourceInsightId?: string;               // Link to research insight that inspired this
}

// ============================================
// PAID MEDIA STRATEGY (Channel Allocation)
// ============================================

export interface PaidMediaStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Campaign approach
  campaignType: 'net-new' | 'bau-adsets' | 'creative-testing' | 'none';

  // Channel allocations
  channels: PaidMediaChannel[];

  // Key metrics to track
  keyMetrics: string[];
}

export interface PaidMediaChannel {
  id: string;
  name: 'meta' | 'tiktok' | 'google' | 'youtube' | 'pinterest' | 'ctv' | 'applovin' | 'programmatic';
  enabled: boolean;
  budgetPercent?: number;
  notes?: string;
}

// ============================================
// ORGANIC SOCIAL STRATEGY
// ============================================

export interface OrganicSocialStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Posts by platform
  instagramPosts: OrganicPostItem[];
  tiktokPosts: OrganicPostItem[];
  youtubePosts: OrganicPostItem[];

  // Creator content (outsourced)
  creatorContent?: {
    deliverables: number;
    collabPosts: number;
  };

  // Platform-specific notes
  platformNotes?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
}

export interface OrganicPostItem {
  id: string;
  format: 'feed' | 'story' | 'reel' | 'short' | 'long-form';
  timing: string;
  concept: string;
}

// ============================================
// INFLUENCER STRATEGY
// ============================================

export interface InfluencerStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Budgets
  sponsoredBudget?: number;
  paidContentBudget?: number;
  expectedAds?: number;

  // Seeding
  seedingCount: { min: number; max: number };
  vipTier: boolean;

  // Creator tiers
  creatorTiers: { micro: number; mid: number; macro: number };

  // Commission
  commissionIncrease?: {
    enabled: boolean;
    duration?: string;
  };

  // Community
  communityChallenges: boolean;

  // Content types to request
  contentTypes: string[];

  // Brief points for creators
  briefPoints: string[];
}

// ============================================
// ECOM STRATEGY (Site Placements)
// ============================================

export interface EcomStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Placement checklist
  placements: EcomPlacement[];

  // Landing page types needed
  landingPages?: {
    listicle: boolean;
    trojanHorse: boolean;
    custom: boolean;
  };
}

export interface EcomPlacement {
  id: string;
  type: 'hp-hero' | 'hp-secondary' | 'hp-featured' | 'breakout-card-small' | 'breakout-card-large' |
        'promo-bar' | 'tags' | 'pdp-full' | 'pdp-partial' | 'collection-page' | 'quiz' |
        'pre-launch' | 'blog-post' | 'early-access';
  enabled: boolean;
  notes?: string;
}

// ============================================
// PR & AFFILIATE STRATEGY
// ============================================

export interface PRAffiliateStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // PR
  prAngle: string;
  keyMessages?: string[];
  targetOutlets?: string[];
  longLeadFeatures: { count: number; targets: string[] };
  productPlacements: { count: number; targets: string[] };
  awards: boolean;
  earlyAccess: boolean;

  // Affiliate
  affiliateApproach: string;
  commissionIncrease?: {
    enabled: boolean;
    duration?: string;
  };
}

// ============================================
// RETAIL STRATEGY
// ============================================

export interface RetailStrategy {
  status: 'draft' | 'approved';
  strategicSummary: string;

  // Activations by type
  activations: RetailActivation[];
}

export interface RetailActivation {
  id: string;
  retailer: 'sephora' | 'ulta' | 'retail-store' | 'all';
  type: 'table-display' | 'front-display' | 'event' | 'tv-update' | 'signage' |
        'window-display' | 'brochure' | 'exclusive-offer' | 'apparel';
  enabled: boolean;
  notes?: string;
}

// ============================================
// CHANNEL DELIVERABLES (Step 3 output)
// These are the ACTUAL BRIEFS with copy
// ============================================

export interface ChannelDeliverables {
  // New channel structure
  retention?: RetentionDeliverables;
  creative?: CreativeDeliverable[];
  paidMedia?: PaidMediaDeliverable[];
  organicSocial?: OrganicDeliverable[];
  influencer?: InfluencerDeliverable[];
  ecom?: EcomDeliverable[];
  prAffiliate?: PRAffiliateDeliverable[];
  retail?: RetailDeliverable[];
}

// Retention deliverables (emails + SMS)
export interface RetentionDeliverables {
  emails: EmailDeliverable[];
  sms: SMSDeliverable[];
}

// Email Deliverable
export interface EmailDeliverable {
  id: string;
  strategyItemId: string;
  type: EmailType;
  name: string;
  audience: EmailAudience;
  copy: {
    subjectLines: string[];
    preheader: string;
    headline: string;
    body: string;
    cta: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// SMS Deliverable
export interface SMSDeliverable {
  id: string;
  strategyItemId: string;
  type: SMSType;
  name: string;
  copy: {
    message: string;
    link?: string;
  };
  characterCount: number;
  status: 'generated' | 'edited' | 'approved';
}

// Creative Deliverable
export interface CreativeDeliverable {
  id: string;
  conceptId: string;
  conceptName: string;
  format: 'static' | 'video' | 'carousel' | 'ugc-brief';
  // Persona context (carried from concept)
  targetPersona?: PersonaId | 'general';
  personaName?: string;
  copy: {
    primaryText: string;
    headline: string;
    linkDescription?: string;
    creativeHeadline?: string;
    subhead?: string;
    cta?: string;
    badge?: string;
    hook?: string;
    script?: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// Paid Media Deliverable
export interface PaidMediaDeliverable {
  id: string;
  channel: PaidMediaChannel['name'];
  type: 'ad-copy' | 'script' | 'brief';
  copy: {
    headline?: string;
    body: string;
    cta?: string;
    targetingNotes?: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// Organic Social Deliverable
export interface OrganicDeliverable {
  id: string;
  postItemId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  format: OrganicPostItem['format'];
  copy: {
    caption: string;
    hashtags?: string[];
    hook?: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// Influencer Deliverable
export interface InfluencerDeliverable {
  id: string;
  name: string;
  copy: {
    briefDocument: string;
    talkingPoints: string[];
    dosAndDonts: { dos: string[]; donts: string[] };
  };
  status: 'generated' | 'edited' | 'approved';
}

// Ecom Deliverable
export interface EcomDeliverable {
  id: string;
  placementId: string;
  type: EcomPlacement['type'];
  copy: {
    headline: string;
    subhead?: string;
    body: string;
    bullets?: string[];
    cta?: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// PR and Affiliate Deliverable
export interface PRAffiliateDeliverable {
  id: string;
  type: 'press-release' | 'media-pitch' | 'fact-sheet' | 'affiliate-brief' | 'affiliate-email';
  copy: {
    title: string;
    body: string;
    boilerplate?: string;
    talkingPoints?: string[];
  };
  status: 'generated' | 'edited' | 'approved';
}

// Retail Deliverable
export interface RetailDeliverable {
  id: string;
  activationId: string;
  type: 'endcap-copy' | 'shelf-talker' | 'counter-card' | 'sampling-card' | 'brochure' | 'signage';
  retailer: RetailActivation['retailer'];
  copy: {
    headline: string;
    body: string;
    callout?: string;
  };
  status: 'generated' | 'edited' | 'approved';
}

// ============================================
// PMC & CREATIVE BRIEF (Step 1)
// ============================================

export interface PMCDocument {
  tagline: string;
  whatItIs: string;
  whyWeLoveIt: string;
  howItsDifferent: string;
  howToUse: string;
  whoItsFor: string;
  bobbisQuotes: { context: string; quote: string }[];
  ingredients?: string;
  faqs?: { question: string; answer: string }[];
}

export interface CreativeBrief {
  productName: string;
  launchDate: string;
  tier: LaunchTier;
  launchOverview: string;
  keyBenefits: string[];
  targetDemographic: string;
  creativeConsiderations: string;
  keyDetails: string;
  regulatoryConsiderations?: string;

  // Enhanced fields based on Foundation Stick brief format
  consumerInsights?: {
    topDesires: string[];
    topConcerns: string[];
    appealingClaims: string[];
    categoryAttitudes?: string;
  };
  potentialBarriers?: string[];
  keyDifferentiator?: string;
  positioningStatement?: string;
  coreMessage?: string;
  creativeDeliverables?: {
    visualDirection: string;
    taglineOptions: string[];
  };
  otherDifferentiators?: string[];
}

// ============================================
// TIER CONFIGURATION
// ============================================

export const TIER_CONFIG = {
  'tier-1': {
    description: 'Hero Launch - $5MM+ revenue target',
    campaignDuration: '1 Month (2 weeks dedicated, 2 weeks sustained)',

    // Retention
    retention: {
      emails: { min: 8, max: 12 },
      sms: { min: 4, max: 6 },
      directMail: true,
      popup: true,
      flows: { dedicated: true, universalFooter: true },
    },

    // Creative
    creative: {
      concepts: { min: 10, max: 15 },
      ugcCreators: { min: 3, max: 5 },
      partnershipFocus: 'heavy' as const,
    },

    // Paid Media
    paidMedia: {
      campaignType: 'net-new' as const,
      channels: ['meta', 'youtube', 'ctv', 'pinterest', 'google', 'applovin', 'tiktok'],
    },

    // Organic Social
    organicSocial: {
      instagram: { grid: 10, reels: 10, stories: 10 },
      tiktok: 6,
      youtube: { shorts: 10, longform: 1 },
      creatorContent: { deliverables: 4, collabs: 2 },
    },

    // Influencer
    influencer: {
      sponsoredBudget: 20000,
      paidContentBudget: 50000,
      expectedAds: 8,
      seeding: { min: 600, max: 800 },
      vipTier: true,
      commissionIncrease: '2 weeks',
      communityChallenges: true,
    },

    // Ecom
    ecom: {
      hpHero: true,
      hpSecondary: true,
      hpFeatured: true,
      breakoutCards: true,
      customTags: true,
      fullPdp: true,
      quiz: true,
      preLaunch: true,
      blogPost: true,
      earlyAccess: true,
      landingPages: { listicle: true, trojanHorse: true, custom: true },
    },

    // PR & Affiliate
    prAffiliate: {
      longLeadFeatures: 3,
      productPlacements: 12,
      awards: true,
      earlyAccess: true,
      commissionIncrease: '2 weeks',
    },

    // Retail
    retail: {
      storeTakeover: true,
      events: 2,
      brochure: true,
      signage: true,
      windowDisplay: true,
      tvUpdate: true,
      exclusiveOffer: true,
    },
  },

  'tier-2': {
    description: 'Major Launch - $2.5MM-$5MM revenue target',
    campaignDuration: 'Minimum 10 days',

    retention: {
      emails: { min: 4, max: 6 },
      sms: { min: 3, max: 5 },
      directMail: 'possible',
      popup: false,
      flows: { dedicated: false, universalFooter: true },
    },

    creative: {
      concepts: { min: 6, max: 8 },
      ugcCreators: { min: 2, max: 3 },
      partnershipFocus: 'moderate' as const,
    },

    paidMedia: {
      campaignType: 'bau-adsets' as const,
      channels: ['meta', 'youtube', 'pinterest', 'google', 'applovin', 'tiktok'],
    },

    organicSocial: {
      instagram: { grid: 7, reels: 7, stories: 7 },
      tiktok: 4,
      youtube: { shorts: 7, longform: 0 },
      creatorContent: { deliverables: 2, collabs: 1 },
    },

    influencer: {
      sponsoredBudget: 10000,
      paidContentBudget: 30000,
      expectedAds: 6,
      seeding: { min: 300, max: 500 },
      vipTier: true,
      commissionIncrease: 'possible',
      communityChallenges: 'possible',
    },

    ecom: {
      hpHero: true,
      hpSecondary: false,
      hpFeatured: true,
      breakoutCards: true,
      customTags: false,
      fullPdp: true,
      quiz: false,
      preLaunch: true,
      blogPost: false,
      earlyAccess: false,
      landingPages: { listicle: true, trojanHorse: true, custom: false },
    },

    prAffiliate: {
      longLeadFeatures: 1,
      productPlacements: 8,
      awards: false,
      earlyAccess: false,
      commissionIncrease: 'possible',
    },

    retail: {
      storeTakeover: false,
      events: 0,
      brochure: false,
      signage: false,
      windowDisplay: false,
      tvUpdate: 'possible',
      exclusiveOffer: 'possible',
    },
  },

  'tier-3': {
    description: 'Standard Launch - $500K-$2.5MM revenue target',
    campaignDuration: 'Minimum 6 days',

    retention: {
      emails: { min: 3, max: 4 },
      sms: { min: 2, max: 3 },
      directMail: false,
      popup: false,
      flows: { dedicated: false, universalFooter: false },
    },

    creative: {
      concepts: { min: 4, max: 6 },
      ugcCreators: { min: 0, max: 0 },
      partnershipFocus: 'none' as const,
    },

    paidMedia: {
      campaignType: 'creative-testing' as const,
      channels: ['meta', 'youtube', 'pinterest', 'google'],
    },

    organicSocial: {
      instagram: { grid: 4, reels: 4, stories: 4 },
      tiktok: 2,
      youtube: { shorts: 4, longform: 0 },
      creatorContent: null,
    },

    influencer: {
      sponsoredBudget: 0,
      paidContentBudget: 0,
      expectedAds: 0,
      seeding: { min: 200, max: 400 },
      vipTier: false,
      commissionIncrease: 'during promo',
      communityChallenges: 'possible',
    },

    ecom: {
      hpHero: 'possible',
      hpSecondary: false,
      hpFeatured: false,
      breakoutCards: 'small only',
      customTags: false,
      fullPdp: 'partial',
      quiz: false,
      preLaunch: 'possible',
      blogPost: false,
      earlyAccess: false,
      landingPages: { listicle: true, trojanHorse: true, custom: false },
    },

    prAffiliate: {
      longLeadFeatures: 0,
      productPlacements: 4,
      awards: false,
      earlyAccess: false,
      commissionIncrease: 'during promo',
    },

    retail: {
      storeTakeover: false,
      events: 0,
      brochure: false,
      signage: false,
      windowDisplay: false,
      tvUpdate: false,
      exclusiveOffer: false,
    },
  },

  'tier-4': {
    description: 'Minor Launch - Under $500K revenue target',
    campaignDuration: 'Minimum 3 days',

    retention: {
      emails: { min: 1, max: 2 },
      sms: { min: 1, max: 1 },
      directMail: false,
      popup: false,
      flows: { dedicated: false, universalFooter: false },
    },

    creative: {
      concepts: { min: 0, max: 0 },
      ugcCreators: { min: 0, max: 0 },
      partnershipFocus: 'none' as const,
    },

    paidMedia: {
      campaignType: 'none' as const,
      channels: [],
    },

    organicSocial: {
      instagram: { grid: 2, reels: 0, stories: 2 },
      tiktok: 0,
      youtube: { shorts: 0, longform: 0 },
      creatorContent: null,
    },

    influencer: {
      sponsoredBudget: 0,
      paidContentBudget: 0,
      expectedAds: 0,
      seeding: { min: 0, max: 250 },
      vipTier: false,
      commissionIncrease: null,
      communityChallenges: false,
    },

    ecom: {
      hpHero: false,
      hpSecondary: false,
      hpFeatured: false,
      breakoutCards: false,
      customTags: false,
      fullPdp: 'partial',
      quiz: false,
      preLaunch: false,
      blogPost: false,
      earlyAccess: false,
      landingPages: { listicle: false, trojanHorse: false, custom: false },
    },

    prAffiliate: {
      longLeadFeatures: 0,
      productPlacements: 0,
      awards: false,
      earlyAccess: false,
      commissionIncrease: null,
    },

    retail: {
      storeTakeover: false,
      events: 0,
      brochure: false,
      signage: false,
      windowDisplay: false,
      tvUpdate: false,
      exclusiveOffer: false,
    },
  },
} as const;

// Persona configuration for creative strategy
export const PERSONA_CONFIG = {
  'dedicated-educator': {
    name: 'The Dedicated Educator',
    percentage: 15,
    priority: 'medium' as const,
  },
  'ageless-matriarch': {
    name: 'The Ageless Matriarch',
    percentage: 15,
    priority: 'high' as const,
  },
  'high-powered-executive': {
    name: 'The High-Powered Executive',
    percentage: 20,
    priority: 'high' as const,
  },
  'wellness-healthcare-practitioner': {
    name: 'The Wellness & Healthcare Practitioner',
    percentage: 15,
    priority: 'high' as const,
  },
  'busy-suburban-supermom': {
    name: 'The Busy Suburban Super-Mom',
    percentage: 20,
    priority: 'high' as const,
  },
  'creative-entrepreneur': {
    name: 'The Creative Entrepreneur',
    percentage: 10,
    priority: 'medium' as const,
  },
} as const;

// Channel display info
export const CHANNEL_CONFIG = {
  'retention': {
    name: 'Retention',
    description: 'Email, SMS, Direct Mail, Pop-ups, Flows',
  },
  'creative': {
    name: 'Creative Strategy',
    description: 'Visual concepts and messaging for paid media',
  },
  'paid-media': {
    name: 'Paid Media',
    description: 'Channel allocation and targeting strategy',
  },
  'organic-social': {
    name: 'Organic Social',
    description: 'Instagram, TikTok, YouTube content plan',
  },
  'influencer': {
    name: 'Influencer',
    description: 'Creator partnerships, seeding, and community',
  },
  'ecom': {
    name: 'Ecom',
    description: 'Site placements, PDPs, and landing pages',
  },
  'pr-affiliate': {
    name: 'PR & Affiliate',
    description: 'Press, media placements, and affiliate marketing',
  },
  'retail': {
    name: 'Retail',
    description: 'In-store activations and merchandising',
  },
} as const;

// Email types for retention strategy - All 15 types from email framework
export const EMAIL_TYPES = [
  { id: 'gtl', name: 'GTL (Get the Look)', description: 'Step-by-step tutorial for recreating a look' },
  { id: 'plain-text', name: 'Plain Text Note', description: 'Personal letter-style note from Bobbi/brand' },
  { id: 'product-spotlight', name: 'Product Spotlight', description: 'Deep dive on ONE hero product' },
  { id: 'product-roundup', name: 'Product Roundup', description: 'Theme-based curated collection' },
  { id: 'back-in-stock', name: 'Back in Stock', description: 'Restocked item announcement with urgency' },
  { id: 'launch', name: 'Product Launch', description: 'New product announcement' },
  { id: 'teaser', name: 'Teaser (Pre-Launch)', description: 'Build anticipation before launch' },
  { id: 'retail-event', name: 'Retail Event / Pop-Up', description: 'Drive attendance to IRL event' },
  { id: 'promotional', name: 'Promotional (GWP/Sale)', description: 'Announce promotion, GWP, or sale' },
  { id: 'set-kit', name: 'Set or Kit', description: 'Promote bundled set emphasizing value' },
  { id: 'how-to', name: 'How-To (Problem/Solution)', description: 'Address problem, position product as solution' },
  { id: 'duos', name: 'Duos / Combos', description: 'Two products that work better together' },
  { id: 'shade-roundup', name: 'Shade Roundup', description: 'Showcase shade range for different needs' },
  { id: 'product-tutorial', name: 'Product Tutorial', description: 'How to apply/use a specific product' },
  { id: 'social-proof', name: 'Social Proof', description: 'Customer reviews or press quotes' },
] as const;

// SMS types for retention strategy
export const SMS_TYPES = [
  { id: 'launch', name: 'Launch', description: 'Launch day SMS' },
  { id: 'reminder', name: 'Reminder', description: 'Mid-campaign reminder' },
  { id: 'last-chance', name: 'Last Chance', description: 'Final push' },
  { id: 'social-proof', name: 'Social Proof', description: 'Review highlight' },
] as const;

// Hook formulas for creative concepts
export const HOOK_FORMULAS = [
  { id: 'problem-first', name: 'Problem-First', description: 'Lead with the problem the product solves' },
  { id: 'identity-first', name: 'Identity-First', description: 'Lead with who the product is for' },
  { id: 'contrarian', name: 'Contrarian/Positioning', description: 'Challenge conventional wisdom' },
  { id: 'direct-benefit', name: 'Direct Benefit', description: 'Lead with the key benefit' },
] as const;
