export interface Persona {
  id: string;
  name: string;
  overview: string;
  demographics: {
    profession: string;
    socioeconomicStatus: string;
    familyStatus: string;
    geography: string;
  };
  keyMotivations: string[]; // These are the "angles"
  whyBrandAppeals: string;
  languageThatResonates?: string[];
  languageToAvoid?: string[];
  productAffinities?: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  keyBenefits: string[];
  shades?: string;
  bestFor: string;
}

export interface Brief {
  id: string;
  persona: Persona;
  product: Product;
  angle: string; // The key motivation being tested
  angleNotes?: string; // Additional notes/context for the angle
  format: {
    id: string;
    name: string;
    thumbnail: string;
    specs: {
      copyPlacements: Array<{
        zone: string;
        position: string;
        style: string;
        maxChars: number;
        required: boolean;
      }>;
      styleNotes: string;
    };
  };
  generatedCopy: string | {
    [zone: string]: string;
  };
  status: "pending" | "generated" | "edited";
  createdAt: string;
}

export interface BriefGeneratorState {
  selectedPersona: Persona | null;
  selectedProducts: Product[];
  selectedAngles: string[];
  selectedFormats: Array<{
    id: string;
    name: string;
    thumbnail: string;
  }>;
  generatedBriefs: Brief[];
}

// Saved brief with assignment info
export interface SavedBrief extends Brief {
  assignedTo?: string; // Designer name
  boardId: string;
  savedAt: string;
  notes?: string;
}

// A collection of briefs saved together
export interface BriefBoard {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  persona: Persona;
  briefs: SavedBrief[];
  designers: string[]; // List of designer names used in this board
}
