export interface CopyPlacement {
  zone: string;
  position: string;
  style: string;
  maxChars: number;
  required: boolean;
  description?: string;
}

export interface AdFormatSpecs {
  copyPlacements: CopyPlacement[];
  styleNotes: string;
  bestFor: string[];
}

export interface AdFormat {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  thumbnail: string;
  sampleImages: string[];
  specs: AdFormatSpecs;
  category?: string;
}
