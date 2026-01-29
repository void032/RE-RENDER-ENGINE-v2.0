
export enum StyleFidelity {
  HARD = 'Hard Style',
  REALISTIC = 'Realistic Blend'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | 'AUTO';

export interface ImageState {
  url: string | null;
  base64: string | null;
  mimeType: string | null;
  width?: number;
  height?: number;
}

export interface RefMetadata {
  artStyle: string;
  outfitDetails: string;
  poseAndGestures: string;
  backgroundElements: string;
  lightingAndColor: string;
  composition: string; // New: captures occlusions, foreground elements, and framing
}

export interface AnalysisResult {
  text: string;
  timestamp: Date;
}
