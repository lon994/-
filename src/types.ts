/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HighlightStyle = 'paw' | 'heart' | 'dot' | 'spiral' | 'star' | 'glass';

export interface EyeParams {
  eyelidLeft: number;      // 0 = closed, 1 = fully open
  eyelidRight: number;     // 0 = closed, 1 = fully open
  eyelidLeftShape: 'round' | 'happy' | 'squint' | 'closed';
  eyelidRightShape: 'round' | 'happy' | 'squint' | 'closed';
  pupilX: number;          // -1 to +1 (left to right)
  pupilY: number;          // -1 to +1 (top to bottom)
  pupilScale: number;      // 0.5 to 1.8
  highlightStyle: HighlightStyle;
  blushOpacity: number;    // 0 to 1
  rotateAngle: number;     // rotation in degrees (for tilting or rolling pupils)
  squishX: number;         // physical squish factor (width)
  squishY: number;         // physical squish factor (height)
  awakePercent: number;    // 0 = completely asleep, 1 = fully awake
  zzzOpacity: number;      // opacity of sleepy Zz bubbles
  zzzScale: number;        // scale of sleepy Zz bubbles
  zzzX: number;            // horizontal float offset
  zzzY: number;            // vertical float offset
}

export interface AnimationSection {
  name: string;
  labelChinese: string;
  start: number;           // start time in seconds
  end: number;             // end time in seconds
  color: string;           // visual coloring for timelines
  description: string;     // user-friendly purpose
}

export interface StudioConfig {
  resolution: number;      // exporting square dimension (e.g. 128, 240, 256)
  playbackFps: number;     // fps for preview (defaults to 30)
  exportFps: number;       // export file frame rate
  pupilColor: string;      // custom eyeball dominant color (default blue)
  irisColor: string;       // secondary ring or inner glow color
  blushColor: string;      // soft cheek glow color
  fabricColor: string;     // plush skin fabric color
  showGuides: boolean;     // grid lines
  syncEyes: boolean;       // whether left/right move symmetrically
  singleEyeMode: boolean;  // whether to show only a single centered eye
  lockGlassHighlights: boolean; // lock/override highlights to PNG glass bubbles style
  screenFormat?: 'square' | 'portrait_240_320'; // New option for screen shape
  // AI-generated Universal Plush Toy descriptors & overlays
  toyName?: string;
  toyExplanation?: string;
  animalType?: string;
  customSpeed?: number;
  customScale?: number;
  customBlushMax?: number;
}
