/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EyeParams, StudioConfig } from '../types';

/**
 * Helper to draw a cute, slightly rotated 5-pointed star.
 */
function drawCute5PointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  rotation: number,
  fillStyle: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.moveTo(0, -rOuter);
  for (let i = 0; i < 5; i++) {
    ctx.rotate(Math.PI / 5);
    ctx.lineTo(0, -rInner);
    ctx.rotate(Math.PI / 5);
    ctx.lineTo(0, -rOuter);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a single eye onto a canvas context relative to a center point (cx, cy) and radius.
 * This function is fully deterministic and resolution-independent, allowing pixel-perfect exports.
 */
export function drawEye(
  ctx: CanvasRenderingContext2D,
  params: EyeParams,
  config: StudioConfig,
  cx: number,
  cy: number,
  r: number,
  isLeft: boolean
) {
  ctx.save();

  const eyeScaleX = params.squishX;
  const eyeScaleY = params.squishY;

  // Let's create key coordinates relative to the center and radius (r)
  ctx.translate(cx, cy);
  ctx.scale(eyeScaleX, eyeScaleY);

  // 1. --- EYE SOCKET BASE / SCLERA ---
  // The base outline of the eye.
  ctx.beginPath();
  if (config.singleEyeMode) {
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
  } else {
    ctx.ellipse(0, 0, r, r * 0.95, 0, 0, 2 * Math.PI);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Draw dark outline for the eye socket (disabled in single eye mode to remove outer black borders)
  if (!config.singleEyeMode) {
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.strokeStyle = '#222831';
    ctx.stroke();
  }

  // Create a clip region for everything inside the eyeball (Iris and Pupils)
  // so they don't bleed out when moving or when eyelids close.
  ctx.save();
  ctx.beginPath();
  if (config.singleEyeMode) {
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
  } else {
    const strokeWidth = Math.max(2, r * 0.05);
    ctx.ellipse(0, 0, r - strokeWidth / 2, r * 0.95 - strokeWidth / 2, 0, 0, 2 * Math.PI);
  }
  ctx.clip();

  // 2. --- PREMIUM DESIGNER IRIS & CAUSTIC INNER GLOW ---
  const t = typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000;

  // We split the interior into multiple visual depth planes:
  // A. Deep backdrop (moves slightly with gaze)
  // B. Iris caustic glow and ray textures (vivid light scattering)
  // C. Pupil core and dynamic focus aperture (slides beneath the lens dome)
  // D. Outer glass refraction bubbles (moves minimally to produce 3D depth parallax)

  ctx.save();
  // Deep background gaze sway
  ctx.translate(params.pupilX * r * 0.12, params.pupilY * r * 0.12);

  const outerBlue = config.pupilColor || '#0F213A'; // Rich deep navy rim matching reference
  const innerBlue = config.irisColor || '#4E8FC4';   // Bright steel blue inner glow matching reference

  // Base iris gradient
  const irisGrad = ctx.createRadialGradient(
    0, 0, r * 0.15,
    0, 0, r * 1.05
  );
  irisGrad.addColorStop(0, innerBlue);
  irisGrad.addColorStop(0.45, '#4B88B8');
  irisGrad.addColorStop(0.78, outerBlue);
  irisGrad.addColorStop(1, '#0C111A'); // Absolute deep outer border

  ctx.beginPath();
  if (config.singleEyeMode) {
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
  } else {
    ctx.ellipse(0, 0, r, r * 0.95, 0, 0, 2 * Math.PI);
  }
  ctx.fillStyle = irisGrad;
  ctx.fill();

  // Highlight style choice
  const highlightStyle = config.lockGlassHighlights ? 'glass' : params.highlightStyle;

  // PREMIUM MASTERCLASS DETAIL: Inner caustic light refraction (concentrated opposite to light reflection)
  // Elite animators use this to simulate light gathering inside the water/glass of the eye!
  if (highlightStyle === 'glass') {
    ctx.save();
    // Soft glowing light pool reflecting at the bottom left/bottom center of the eyeball rim
    const causticGrad = ctx.createRadialGradient(
      -r * 0.15, r * 0.25, r * 0.1,
      -r * 0.15, r * 0.25, r * 0.92
    );
    causticGrad.addColorStop(0, 'rgba(125, 203, 255, 0.5)'); // Ambient liquid cyan radiance
    causticGrad.addColorStop(0.4, 'rgba(74, 145, 201, 0.22)');
    causticGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.beginPath();
    if (config.singleEyeMode) {
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
    } else {
      ctx.ellipse(0, 0, r, r * 0.95, 0, 0, 2 * Math.PI);
    }
    ctx.fillStyle = causticGrad;
    ctx.fill();
    ctx.restore();

    // Subtle soft light fibers/rays (adds incredible soul and intricate texture)
    ctx.save();
    ctx.globalAlpha = 0.085;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    const rayCount = 28;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * 2 * Math.PI + (Math.sin(t * 0.15) * 0.08);
      ctx.beginPath();
      ctx.moveTo(r * 0.42 * Math.cos(angle), r * 0.42 * Math.sin(angle));
      ctx.lineTo(r * 0.88 * Math.cos(angle), r * 0.88 * Math.sin(angle));
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore(); // Restore from deep background gaze sway


  // 3. --- DEEPER PUPIL GROUP (Slides underneath the highlights) ---
  ctx.save();
  ctx.translate(params.pupilX * r * 0.38, params.pupilY * r * 0.38);
  ctx.rotate((params.rotateAngle * Math.PI) / 180);

  const basePupilRadius = r * 0.52 * params.pupilScale;

  // Multi-layered deep dark pupil core (adding depth so its edge looks velvet and rich)
  ctx.beginPath();
  ctx.arc(0, 0, basePupilRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#050C16'; // Absolute core blackhole
  ctx.fill();

  // Subtle dark core glow
  const pupilGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, basePupilRadius);
  pupilGlow.addColorStop(0, 'rgba(15, 30, 50, 0.75)');
  pupilGlow.addColorStop(0.7, 'rgba(5, 12, 22, 0.0)');
  ctx.beginPath();
  ctx.arc(0, 0, basePupilRadius, 0, 2 * Math.PI);
  ctx.fillStyle = pupilGlow;
  ctx.fill();

  // Draw elegant inner fine-structure ring
  ctx.beginPath();
  ctx.arc(0, 0, basePupilRadius * 0.88, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = Math.max(1, r * 0.022);
  ctx.stroke();

  // Non-glass highlight shapes (heart, paw, star, spiral) drawn inside pupil center
  if (highlightStyle !== 'glass') {
    ctx.save();
    const symbolColor = '#FFFFFF';
    ctx.fillStyle = symbolColor;

    if (highlightStyle === 'heart') {
      const h = basePupilRadius * 0.48;
      ctx.beginPath();
      ctx.translate(0, -h * 0.2);
      ctx.moveTo(0, h * 0.4);
      ctx.bezierCurveTo(-h * 0.8, -h * 0.4, -h * 1.0, -h * 1.0, 0, -h * 1.25);
      ctx.bezierCurveTo(h * 1.0, -h * 1.0, h * 0.8, -h * 0.4, 0, h * 0.4);
      ctx.closePath();
      ctx.shadowColor = 'rgba(236, 72, 153, 0.85)';
      ctx.shadowBlur = Math.max(5, r * 0.15);
      ctx.fill();
    }
    else if (highlightStyle === 'paw') {
      const pw = basePupilRadius * 0.4;
      const ph = basePupilRadius * 0.32;
      ctx.beginPath();
      ctx.ellipse(0, pw * 0.15, pw, ph, 0, 0, 2 * Math.PI);
      ctx.fill();

      const toeR = pw * 0.3;
      const toes = [
        { dx: -pw * 0.95, dy: -ph * 0.6, rx: toeR * 0.8, ry: toeR * 1.1, ang: -0.25 },
        { dx: -pw * 0.35, dy: -ph * 1.25, rx: toeR * 1.0, ry: toeR * 1.25, ang: -0.05 },
        { dx: pw * 0.35, dy: -ph * 1.25, rx: toeR * 1.0, ry: toeR * 1.25, ang: 0.05 },
        { dx: pw * 0.95, dy: -ph * 0.6, rx: toeR * 0.8, ry: toeR * 1.1, ang: 0.25 }
      ];
      for (const toe of toes) {
        ctx.save();
        ctx.translate(toe.dx, toe.dy);
        ctx.rotate(toe.ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, toe.rx, toe.ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }
    else if (highlightStyle === 'star') {
      const sr = basePupilRadius * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -sr);
      ctx.quadraticCurveTo(0, 0, sr, 0);
      ctx.quadraticCurveTo(0, 0, 0, sr);
      ctx.quadraticCurveTo(0, 0, -sr, 0);
      ctx.quadraticCurveTo(0, 0, 0, -sr);
      ctx.closePath();
      ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
      ctx.shadowBlur = Math.max(6, r * 0.16);
      ctx.fill();
    }
    else if (highlightStyle === 'spiral') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2.5, r * 0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const maxLoops = 2.4;
      const points = 80;
      for (let i = 2; i <= points; i++) {
        const angle = (i / points) * maxLoops * 2 * Math.PI;
        const rad = (i / points) * basePupilRadius * 0.85;
        const x = rad * Math.cos(angle);
        const y = rad * Math.sin(angle);
        if (i === 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw two cute stars for the glass style (matching the requested premium Image 2 style)
  if (highlightStyle === 'glass') {
    ctx.save();
    // Use lovely pastel cyan/blue for classic stars matching Image 2
    const starColor = '#9CE5FF';
    
    // Star 1 (larger): bottom-left
    const s1x = -basePupilRadius * 0.58;
    const s1y = basePupilRadius * 0.3;
    const s1Outer = basePupilRadius * 0.18;
    const s1Inner = basePupilRadius * 0.08;
    drawCute5PointStar(ctx, s1x, s1y, s1Outer, s1Inner, -0.15, starColor);

    // Star 2 (smaller): bottom-left-center
    const s2x = -basePupilRadius * 0.28;
    const s2y = basePupilRadius * 0.52;
    const s2Outer = basePupilRadius * 0.11;
    const s2Inner = basePupilRadius * 0.05;
    drawCute5PointStar(ctx, s2x, s2y, s2Outer, s2Inner, 0.1, starColor);
    ctx.restore();
  }

  ctx.restore(); // Restore from Pupil Group


  // 4. --- PREMIUM SOULFUL LENS GLASS REFLECTIONS (Ambient Wobbling Light Source) ---
  // To create a mind-blowing sense of a wet, spherical outer glass lens:
  // - Highlights live on the FRONT of the glass dome, so they shift ONLY minimally (8%) with gaze
  // - They have smooth respiratory shimmers representing dynamic environment reflections
  ctx.save();
  ctx.translate(params.pupilX * r * 0.08, params.pupilY * r * 0.08);

  if (highlightStyle === 'glass') {
    // Elegant swaying animations for the light source mimicking external space
    const shimmerScale = 1.0 + Math.sin(t * 2.5) * 0.016; // 1.6% organic breathing
    const swayX = Math.cos(t * 1.5) * (r * 0.014);
    const swayY = Math.sin(t * 1.2) * (r * 0.014);
    
    ctx.translate(swayX, swayY);
    ctx.scale(shimmerScale, shimmerScale);

    const pupilRadius = r * 0.52 * params.pupilScale;

    // --- BUBBLE 1: Main bottom-left glowing liquid bubble ---
    const b1x = -pupilRadius * 0.42;
    const b1y = pupilRadius * 0.42;
    const b1r = pupilRadius * 0.48;

    // Multi-staged radial refraction gradient
    const grad1 = ctx.createRadialGradient(
      b1x - b1r * 0.25, b1y - b1r * 0.25, b1r * 0.02, // Brightest highlight point
      b1x, b1y, b1r                                   // Soft outer glass halo
    );
    grad1.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad1.addColorStop(0.18, 'rgba(255, 255, 255, 0.98)');
    grad1.addColorStop(0.42, 'rgba(232, 244, 255, 0.82)'); // Luminous liquid blue core
    grad1.addColorStop(0.85, 'rgba(182, 218, 248, 0.32)'); // Lens boundary refraction tint
    grad1.addColorStop(1, 'rgba(182, 218, 248, 0.0)');

    ctx.beginPath();
    ctx.arc(b1x, b1y, b1r, 0, 2 * Math.PI);
    ctx.fillStyle = grad1;
    ctx.fill();

    // Secondary inner reflection crescent border for spectacular multi-layer glass lens feel
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.2, r * 0.018);
    ctx.beginPath();
    ctx.arc(b1x, b1y, b1r * 0.84, 0.95 * Math.PI, 1.6 * Math.PI);
    ctx.stroke();
    ctx.restore();


    // --- BUBBLE 2: Secondary bottom-right bubble ---
    const b2x = pupilRadius * 0.12;
    const b2y = pupilRadius * 0.62;
    const b2r = pupilRadius * 0.32;

    const grad2 = ctx.createRadialGradient(
      b2x - b2r * 0.2, b2y - b2r * 0.2, b2r * 0.03,
      b2x, b2y, b2r
    );
    grad2.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad2.addColorStop(0.2, 'rgba(255, 255, 255, 0.92)');
    grad2.addColorStop(0.5, 'rgba(228, 242, 255, 0.72)');
    grad2.addColorStop(0.85, 'rgba(182, 218, 248, 0.25)');
    grad2.addColorStop(1, 'rgba(182, 218, 248, 0.0)');

    ctx.beginPath();
    ctx.arc(b2x, b2y, b2r, 0, 2 * Math.PI);
    ctx.fillStyle = grad2;
    ctx.fill();


    // --- BUBBLE 3: Smallest bottom-far-right bubble (creates depth cadence) ---
    const b3x = pupilRadius * 0.55;
    const b3y = pupilRadius * 0.55;
    const b3r = pupilRadius * 0.18;

    const grad3 = ctx.createRadialGradient(
      b3x - b3r * 0.15, b3y - b3r * 0.15, b3r * 0.02,
      b3x, b3y, b3r
    );
    grad3.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad3.addColorStop(0.25, 'rgba(255, 255, 255, 0.88)');
    grad3.addColorStop(0.72, 'rgba(215, 235, 255, 0.45)');
    grad3.addColorStop(1, 'rgba(215, 235, 255, 0.0)');

    ctx.beginPath();
    ctx.arc(b3x, b3y, b3r, 0, 2 * Math.PI);
    ctx.fillStyle = grad3;
    ctx.fill();


    // --- BUBBLE 4: Upper-right sharp round specular highlight ---
    const b4x = pupilRadius * 0.48;
    const b4y = -pupilRadius * 0.48; // Positioned high top-right matching Image 2
    const b4rx = pupilRadius * 0.15;  // slightly wider horizontally
    const b4ry = pupilRadius * 0.11;  // slightly narrower vertically
    
    // Specular bloom glow
    ctx.save();
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = Math.max(5, r * 0.05);
    ctx.beginPath();
    // Tilt the oval specular highlight slightly to look organic like Image 2
    ctx.ellipse(b4x, b4y, b4rx, b4ry, -Math.PI / 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();


    // --- PREMIUM HARMONIC ATMOSPHERE: Glass edge reflection glow ---
    // Smooth thin atmospheric crescent line at top-right rim representing external window sheen
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.abs(Math.sin(t * 1.1)) * 0.03;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r * 0.02);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 1.25 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

  } else {
    // Fallback beautiful sharp dot reflections
    ctx.beginPath();
    ctx.arc(-basePupilRadius * 0.45, -basePupilRadius * 0.45, basePupilRadius * 0.22, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(basePupilRadius * 0.45, basePupilRadius * 0.4, basePupilRadius * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }

  ctx.restore(); // Restore from world glass light translation/rotation

  // 5. --- DYNAMIC EYELIDS & BLINK MASKS ---
  // We apply the eyelids from top and/or bottom.
  // The left and right eyelid rates (0 = closed, 1 = open)
  const lOpen = isLeft ? params.eyelidLeft : params.eyelidRight;
  const lShape = isLeft ? params.eyelidLeftShape : params.eyelidRightShape;

  // Let's color the eyelid with a soft aesthetic shade. E.g. peach or soft shadow of fabric.
  const eyelidColor = '#1F2937'; // Slate dark eyelid back, outlined by deep fur peach
  
  if (lShape === 'closed' || lOpen <= 0.02) {
    // Fully closed eyelids: we fill the entire eyeball with deep eyelid color
    ctx.fillStyle = config.fabricColor || '#FDA4AF'; // Soft plush skin color
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw the cute closed sleepy curved line (smiley lash curve: \_/ or \^/)
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.8, r * 0.5, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = Math.max(3.5, r * 0.08);
    ctx.strokeStyle = '#1E293B';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  else if (lShape === 'happy') {
    // Beautiful half-smiling arc closing from the bottom!
    // Happy shape implies drawing a curved mask clipping the bottom of the eye.
    // Let's erase the bottom section of the eye to make it crescent-shaped!
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; // standard draw
    ctx.fillStyle = config.fabricColor || '#FDA4AF'; // Background plush color
    
    ctx.beginPath();
    // Huge overlapping crescent from the bottom
    ctx.moveTo(-r * 1.5, r * 1.5);
    ctx.quadraticCurveTo(0, -r * 0.05, r * 1.5, r * 1.5);
    ctx.lineTo(r * 1.5, r * 2);
    ctx.lineTo(-r * 1.5, r * 2);
    ctx.closePath();
    ctx.fill();
    
    // Draw thick cute curved happy outline
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.85);
    ctx.quadraticCurveTo(0, -r * 0.02, r * 0.95, r * 0.85);
    ctx.lineWidth = Math.max(3.5, r * 0.08);
    ctx.strokeStyle = '#222831';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
  else {
    // Standard open/drooping eyelids (lShape === 'round' or 'squint')
    // We animate a curtain dropping from the top depending on lOpen (1 to 0).
    if (lOpen < 1.0) {
      ctx.save();
      ctx.fillStyle = config.fabricColor || '#FDA4AF'; // Skin tone
      
      const droopY = -r * 1.25 + lOpen * r * 1.6; // Mapping eyelid curve down
      
      ctx.beginPath();
      ctx.moveTo(-r * 1.5, -r * 1.5);
      ctx.lineTo(r * 1.5, -r * 1.5);
      ctx.lineTo(r * 1.5, droopY);
      // Curved edge of the eyelid
      ctx.quadraticCurveTo(0, droopY + r * 0.3 * (1.0 - lOpen), -r * 1.5, droopY);
      ctx.closePath();
      ctx.fill();

      // Top eyelid crease shadow
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, droopY);
      ctx.quadraticCurveTo(0, droopY + r * 0.3 * (1.0 - lOpen), r * 0.95, droopY);
      ctx.lineWidth = Math.max(3, r * 0.07);
      ctx.strokeStyle = '#222831';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    // Playful squint: clip from bottom slightly too to make it cheeky narrow
    if (lShape === 'squint') {
      ctx.save();
      ctx.fillStyle = config.fabricColor || '#FDA4AF';
      const bottomSqueezeY = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(-r * 1.5, r * 1.5);
      ctx.lineTo(r * 1.5, r * 1.5);
      ctx.lineTo(r * 1.5, bottomSqueezeY);
      ctx.quadraticCurveTo(0, bottomSqueezeY - r * 0.1, -r * 1.5, bottomSqueezeY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-r * 0.9, bottomSqueezeY);
      ctx.quadraticCurveTo(0, bottomSqueezeY - r * 0.1, r * 0.9, bottomSqueezeY);
      ctx.lineWidth = Math.max(2.5, r * 0.05);
      ctx.strokeStyle = '#222831';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore(); // Restore from eyeball socket clipping

  // 6. STYLIZED COSMETIC EYELASH WING (THE BLUE EYEBROW/BROW WING) REMOVED AT USER REQUEST
  // (The eyebrow rendering code has been deleted)

  // Restore main context coordinates
  ctx.restore();
}

/**
 * Draws the entire plush elephant face including left eye, right eye, blushes,
 * and optional stitch lines/nose to context.
 */
export function drawPlushElephantFace(
  canvas: HTMLCanvasElement,
  params: EyeParams,
  config: StudioConfig,
  customTime?: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // 1. CLEAR & DRAW FABRIC BACKGROUND
  ctx.clearRect(0, 0, w, h);
  
  const backColor = config.fabricColor || '#FDA4AF'; // Soft pastel rose/peach
  ctx.fillStyle = backColor;
  ctx.fillRect(0, 0, w, h);

  // Apply subtle digital felt fabric weave texture to background if guided
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  // Draw light grid spacing representing textile fibers
  const weaveGap = Math.max(2, w / 150);
  for (let i = 0; i < w; i += weaveGap) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += weaveGap) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(w, j);
    ctx.stroke();
  }
  ctx.restore();

  // 2. STITCH SEAMS IN THE MIDDLE (Central head seam as seen in premium plushies)
  // Drawn only in dual face mode to keep single centered eye display clean
  if (!config.singleEyeMode) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = Math.max(1.5, w * 0.005);
    ctx.setLineDash([Math.max(4, w * 0.015), Math.max(4, w * 0.015)]);
    
    // Center vertical stitch line
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.restore();
  }

  // 3. EYE MEASUREMENTS
  // Compute absolute layout dimensions based on single vs dual screen settings
  const isSingle = !!config.singleEyeMode;
  const eyeRadius = isSingle ? w * 0.38 : w * 0.19; // Enormous centered single eye matching reference PNG
  const eyeSpacing = w * 0.28; // Horizontal spacing center-to-eye

  const leftEyeX = isSingle ? w / 2 : w / 2 - eyeSpacing;
  const rightEyeX = w / 2 + eyeSpacing;
  const eyeY = isSingle ? h / 2 : h * 0.44;     // Positioned dead center for single eye, slightly raised for face dual eyes

  // 4. CHEEK BLUSH (Radial soft gradients on the felt fabric below eyes, skipped in pure single eye display)
  if (!isSingle && params.blushOpacity > 0.01) {
    const blushR = eyeRadius * 1.55;
    const blushColor = config.blushColor || '#FB7185';
    
    // Left blush
    ctx.save();
    ctx.globalAlpha = params.blushOpacity;
    const leftBlushGrad = ctx.createRadialGradient(
      leftEyeX - eyeRadius * 0.1,
      eyeY + eyeRadius * 1.0,
      blushR * 0.05,
      leftEyeX - eyeRadius * 0.1,
      eyeY + eyeRadius * 1.0,
      blushR
    );
    leftBlushGrad.addColorStop(0, blushColor);
    leftBlushGrad.addColorStop(0.3, blushColor);
    leftBlushGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftBlushGrad;
    ctx.beginPath();
    ctx.arc(leftEyeX - eyeRadius * 0.1, eyeY + eyeRadius * 1.0, blushR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Right blush
    ctx.save();
    ctx.globalAlpha = params.blushOpacity;
    const rightBlushGrad = ctx.createRadialGradient(
      rightEyeX + eyeRadius * 0.1,
      eyeY + eyeRadius * 1.0,
      blushR * 0.05,
      rightEyeX + eyeRadius * 0.1,
      eyeY + eyeRadius * 1.0,
      blushR
    );
    rightBlushGrad.addColorStop(0, blushColor);
    rightBlushGrad.addColorStop(0.3, blushColor);
    rightBlushGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightBlushGrad;
    ctx.beginPath();
    ctx.arc(rightEyeX + eyeRadius * 0.1, eyeY + eyeRadius * 1.0, blushR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // 5. DRAW THE EYES
  if (isSingle) {
    // Single centered eye
    drawEye(ctx, params, config, leftEyeX, eyeY, eyeRadius, true);
  } else {
    // Dual Left and Right Eyes
    drawEye(ctx, params, config, leftEyeX, eyeY, eyeRadius, true);
    
    // If syncEyes is false, we can invert pupil coordinates or shapes to add playful asymmetry
    const rightParams = { ...params };
    if (!config.syncEyes) {
      rightParams.pupilX = -params.pupilX * 0.8;
    }
    drawEye(ctx, rightParams, config, rightEyeX, eyeY, eyeRadius, false);
  }

  // 6. DRAW SLEEPY "Zzz" BUBBLE EFECT
  // Derived from params and floats upwards sideways.
  if (params.zzzOpacity > 0.02) {
    ctx.save();
    ctx.globalAlpha = params.zzzOpacity;
    
    // Position Zzz above active eye
    const anchorX = isSingle ? leftEyeX : rightEyeX;
    const zBaseX = anchorX + eyeRadius * 0.5 + params.zzzX;
    const zBaseY = eyeY - eyeRadius * 1.1 + params.zzzY;
    
    ctx.translate(zBaseX, zBaseY);
    ctx.scale(params.zzzScale, params.zzzScale);

    // Nice cartoon text boundary box / speech bubble
    ctx.font = 'bold 36px "Space Grotesk", "Inter", sans-serif';
    ctx.fillStyle = '#6D28D9'; // Deep indigo Sleepy violet
    
    // Glow behind the Zzz
    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 10;
    
    ctx.fillText('Z', 0, 0);
    ctx.font = 'bold 26px "Space Grotesk", "Inter", sans-serif';
    ctx.fillText('z', 22, -15);
    ctx.font = 'bold 18px "Space Grotesk", "Inter", sans-serif';
    ctx.fillText('z', 38, -26);

    ctx.restore();
  }

  // 7. TECHNICAL ALIGNMENT GUIDES (Optional helper overlay for developers)
  if (config.showGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; // Emerald guide
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    // Center vertical crosshair
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Center horizontal baseline
    ctx.beginPath();
    ctx.moveTo(0, eyeY);
    ctx.lineTo(w, eyeY);
    ctx.stroke();

    // Eye bounding boxes
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; // Blue guide
    const renderTargets = isSingle ? [leftEyeX] : [leftEyeX, rightEyeX];
    renderTargets.forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Center hubs
      ctx.fillStyle = '#BCF3FD';
      ctx.beginPath();
      ctx.arc(ex, eyeY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Label annotations
    ctx.fillStyle = 'rgba(31, 41, 55, 0.75)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Resolution: ${w}x${h}px`, 12, 22);
    if (!isSingle) {
      ctx.fillText(`Eye spacing: ${Math.round(eyeSpacing * 2)}px`, 12, 38);
    }
    ctx.fillText(`Eye radius: ${Math.round(eyeRadius)}px`, 12, 54);
    if (customTime !== undefined) {
      ctx.fillText(`Time: ${customTime.toFixed(3)}s`, 12, 70);
    }
    ctx.restore();
  }
}
