/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EyeParams, HighlightStyle, AnimationSection } from './types';

// Define the 12-second core stages
export const ANIMATION_SECTIONS: AnimationSection[] = [
  {
    name: 'Blink',
    labelChinese: '健康眨眼',
    start: 0.0,
    end: 1.5,
    color: '#3B82F6', // Blue
    description: '模拟毛绒大象的自然神态，伴随弹性呼吸与惯性眨眼'
  },
  {
    name: 'Cute',
    labelChinese: '极致卖萌',
    start: 1.5,
    end: 3.5,
    color: '#EC4899', // Pink
    description: '眼睛变为可爱月牙，双颊绽放温热红晕，闪烁爱心高光'
  },
  {
    name: 'Roll',
    labelChinese: '眼珠转转',
    start: 3.5,
    end: 5.5,
    color: '#8B5CF6', // Purple
    description: '瞳孔作360度顺滑滚动，带有微幅惯性延迟与拟真阻尼'
  },
  {
    name: 'Naughty',
    labelChinese: '俏皮调皮',
    start: 5.5,
    end: 7.5,
    color: '#F59E0B', // Amber
    description: '单眼俏皮wink眨眼，高光幻化为星星，洋溢淘气活力'
  },
  {
    name: 'Curious',
    labelChinese: '萌趣好奇',
    start: 7.5,
    end: 9.5,
    color: '#10B981', // Emerald
    description: '瞳孔急剧缩放。视线在微秒内做跳跃式扫视与机械过冲'
  },
  {
    name: 'Sleepy',
    labelChinese: '朦胧犯困',
    start: 9.5,
    end: 12.0,
    color: '#6B7280', // Slate Gray
    description: '眼睑重重下垂、半睁半闭。瞳孔幻化为蚊香漩涡，伴随飘浮的Zzz'
  }
];

export const TOTAL_DURATION = 12.0;

/**
 * Spring physics helper for gorgeous overshoots and dampening.
 * @param t current progress 0..1
 * @param tension spring tension (default 170)
 * @param friction spring friction (default 26)
 */
function springEase(t: number, tension = 150, friction = 15): number {
  // Simple approximation of an underdamped spring
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const omega = Math.sqrt(tension);
  const zeta = friction / (2 * Math.sqrt(tension));
  const alpha = omega * Math.sqrt(1 - zeta * zeta);
  
  // Underdamped response equation: 1 - e^(-zeta*omega*t) * (cos(alpha*t) + (zeta*omega/alpha)*sin(alpha*t))
  const decay = Math.exp(-zeta * omega * t);
  const cosPart = Math.cos(alpha * t);
  const sinPart = Math.sin(alpha * t) * (zeta * omega / alpha);
  return 1 - decay * (cosPart + sinPart);
}

/**
 * Normal Bezier Easing Helper
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function getEyeParamsForTime(time: number): EyeParams {
  // Clamp time within the 12-second cycle
  const t = ((time % TOTAL_DURATION) + TOTAL_DURATION) % TOTAL_DURATION;

  // Initialize baseline params
  const params: EyeParams = {
    eyelidLeft: 1.0,
    eyelidRight: 1.0,
    eyelidLeftShape: 'round',
    eyelidRightShape: 'round',
    pupilX: 0.0,
    pupilY: 0.0,
    pupilScale: 1.0,
    highlightStyle: 'paw',
    blushOpacity: 0.1,
    rotateAngle: 0,
    squishX: 1.0,
    squishY: 1.0,
    awakePercent: 1.0,
    zzzOpacity: 0,
    zzzScale: 0,
    zzzX: 0,
    zzzY: 0
  };

  // 1. BLINK SEGMENT: 0.0s - 1.5s (health / normal)
  if (t >= 0.0 && t < 1.5) {
    params.highlightStyle = 'paw';
    params.blushOpacity = 0.05 + 0.05 * Math.sin(t * Math.PI); // gentle breathing blush
    params.awakePercent = 1.0;

    // Normal look-around breathing
    if (t < 0.6) {
      // Look slightly center-left
      const progress = easeInOutQuad(t / 0.6);
      params.pupilX = -0.15 * progress;
      params.pupilY = -0.05 * progress;
    } else {
      // Return to center
      const progress = easeInOutQuad((t - 0.6) / 0.9);
      params.pupilX = -0.15 + 0.15 * progress;
      params.pupilY = -0.05 + 0.05 * progress;
    }

    // Two rapid, bouncy blinks
    // First blink: 0.2s - 0.45s
    if (t >= 0.2 && t <= 0.45) {
      const bt = (t - 0.2) / 0.25; // 0 to 1
      // Blink down fast, return with spring recoil
      const blinkEyelid = 1.0 - Math.sin(bt * Math.PI);
      params.eyelidLeft = blinkEyelid;
      params.eyelidRight = blinkEyelid;
      if (blinkEyelid < 0.15) {
        params.eyelidLeftShape = 'closed';
        params.eyelidRightShape = 'closed';
      }
      // Squish eye slightly under pressure
      params.squishX = 1.0 + 0.12 * Math.sin(bt * Math.PI);
      params.squishY = 1.0 - 0.15 * Math.sin(bt * Math.PI);
    }
    // Second blink: 1.0s - 1.25s
    else if (t >= 1.0 && t <= 1.25) {
      const bt = (t - 1.0) / 0.25;
      const blinkEyelid = 1.0 - Math.sin(bt * Math.PI);
      params.eyelidLeft = blinkEyelid;
      params.eyelidRight = blinkEyelid;
      if (blinkEyelid < 0.15) {
        params.eyelidLeftShape = 'closed';
        params.eyelidRightShape = 'closed';
      }
      params.squishX = 1.0 + 0.12 * Math.sin(bt * Math.PI);
      params.squishY = 1.0 - 0.15 * Math.sin(bt * Math.PI);
    }
  }

  // 2. CUTE SEGMENT: 1.5s - 3.5s (extreme cute, heart eyes!)
  else if (t >= 1.5 && t < 3.5) {
    const elapsed = t - 1.5; // 0 to 2.0s
    params.highlightStyle = 'heart';
    
    // Smooth transition in for blush and eye shapes
    const transIn = Math.min(1.0, elapsed / 0.3);
    params.blushOpacity = 0.1 + 0.75 * easeInOutQuad(transIn);
    
    // Smooth breathing pupil scale
    params.pupilScale = 1.25 + 0.15 * Math.sin(elapsed * 2 * Math.PI * 1.5);
    
    // Make beautiful smiley upward crescent eyes
    params.eyelidLeftShape = 'happy';
    params.eyelidRightShape = 'happy';
    params.eyelidLeft = 1.0;
    params.eyelidRight = 1.0;
    
    // Dynamic bouncy vertically moving pupils
    const verticalBounce = 0.12 * Math.sin(elapsed * 2 * Math.PI * 1.5);
    params.pupilY = -0.05 + verticalBounce;
    params.pupilX = 0;

    // Elegant squish matching the bounce
    params.squishX = 1.05 + 0.05 * Math.sin(elapsed * 2 * Math.PI * 1.5 + Math.PI / 2);
    params.squishY = 0.95 - 0.05 * Math.sin(elapsed * 2 * Math.PI * 1.5 + Math.PI / 2);
    params.awakePercent = 1.0;
  }

  // 3. EYE ROLLING / LOOKING AROUND: 3.5s - 5.5s
  else if (t >= 3.5 && t < 5.5) {
    const elapsed = t - 3.5; // 0 to 2.0s
    params.highlightStyle = 'paw';
    
    // Blush fades back to medium
    const transIn = Math.min(1.0, elapsed / 0.2);
    params.blushOpacity = 0.85 - 0.65 * easeInOutQuad(transIn);
    
    params.eyelidLeftShape = 'round';
    params.eyelidRightShape = 'round';
    params.pupilScale = 1.05;

    // Compute roll path
    // We do ~1.2 complete rolling rotations.
    // To make it look physically inert, we use a nice accelerating-decelerating angle profile.
    const rollProgress = elapsed / 2.0; // 0..1
    const sCurve = easeInOutQuad(rollProgress);
    const angle = sCurve * 2 * Math.PI * 1.25; // 1.25 circles
    
    // Smoothly increase amplitude at start, decrease at end
    const amplitude = 0.45 * Math.sin(rollProgress * Math.PI);
    
    params.pupilX = amplitude * Math.cos(angle);
    params.pupilY = amplitude * Math.sin(angle);
    
    // Pupil tilt/rotation
    params.rotateAngle = sCurve * 360 * 1.25;

    // Include a natural blink in the middle of rolling to break monotony (at 4.6s to 4.85s)
    if (t >= 4.6 && t <= 4.85) {
      const bt = (t - 4.6) / 0.25;
      const blinkValue = 1.0 - Math.sin(bt * Math.PI);
      params.eyelidLeft = blinkValue;
      params.eyelidRight = blinkValue;
      if (blinkValue < 0.15) {
        params.eyelidLeftShape = 'closed';
        params.eyelidRightShape = 'closed';
      }
    }
  }

  // 4. NAUGHTY / PLAYFUL: 5.5s - 7.5s (Sparkling and alternate Winking)
  else if (t >= 5.5 && t < 7.5) {
    const elapsed = t - 5.5; // 0 to 2.0s
    params.highlightStyle = 'star';
    params.blushOpacity = 0.4;
    params.pupilScale = 1.15;

    // Wink timing: Left eye wink/winks twice
    // First wink: 5.8s - 6.4s (prolonged playful wink)
    // Second wink: 6.8s - 7.2s
    if (t >= 5.8 && t < 6.4) {
      const wt = (t - 5.8) / 0.6; // wink duration 0.6s
      let eyelidVal = 1.0;
      if (wt < 0.15) {
        eyelidVal = 1.0 - (wt / 0.15); // closing
      } else if (wt > 0.8) {
        eyelidVal = (wt - 0.8) / 0.2; // opening smoothly
      } else {
        eyelidVal = 0.0; // completely winked closed
      }
      params.eyelidLeft = eyelidVal;
      if (eyelidVal < 0.15) params.eyelidLeftShape = 'closed';
      
      // Right eye squints playfully
      params.eyelidRightShape = 'squint';
      params.eyelidRight = 0.8;
      
      // Look to the left (your left: negative coordinate)
      params.pupilX = -0.3;
      params.pupilY = 0.15;
    } 
    else if (t >= 6.7 && t < 7.2) {
      // Second quick cute wink
      const wt = (t - 6.7) / 0.5;
      let eyelidVal = 1.0;
      if (wt < 0.2) eyelidVal = 1.0 - (wt / 0.2);
      else if (wt > 0.8) eyelidVal = (wt - 0.8) / 0.2;
      else eyelidVal = 0.0;
      
      params.eyelidLeft = eyelidVal;
      if (eyelidVal < 0.15) params.eyelidLeftShape = 'closed';
      
      params.eyelidRightShape = 'squint';
      params.eyelidRight = 0.85;

      params.pupilX = -0.25;
      params.pupilY = 0.1;
    }
    else {
      // Neutral playful eyes
      params.eyelidLeft = 1.0;
      params.eyelidRight = 1.0;
      params.eyelidLeftShape = 'squint';
      params.eyelidRightShape = 'round';
      params.pupilX = -0.15;
      params.pupilY = 0.05;
    }

    params.rotateAngle = 10 * Math.sin(t * 3); // cute wiggle
  }

  // 5. CURIOUS / DISCOVERY: 7.5s - 9.5s
  else if (t >= 7.5 && t < 9.5) {
    const elapsed = t - 7.5; // 0 to 2.0s
    params.highlightStyle = 'dot';
    params.blushOpacity = 0.2;
    params.eyelidLeftShape = 'round';
    params.eyelidRightShape = 'round';
    
    // Dilating pupils: quick elastic breathing scale
    params.pupilScale = 1.35 + 0.2 * Math.sin(elapsed * 12);

    // Rapid saccades (quick scanning jumps).
    // Let's implement overshooting jumps using our spring solver!
    // 7.5 - 8.0: Centered scanning (slight vibrations)
    // 8.0 - 8.5: Snap Up-Right with spring bounce
    // 8.5 - 9.1: Snap Left-Down with spring bounce
    // 9.1 - 9.5: Return to center
    if (elapsed < 0.5) {
      const vibration = 0.02 * Math.sin(elapsed * 40);
      params.pupilX = vibration;
      params.pupilY = vibration;
      params.eyelidLeft = 1.1; // eyes wide open
      params.eyelidRight = 1.1;
    } else if (elapsed >= 0.5 && elapsed < 1.0) {
      // Snap to Top-Right
      const progress = (elapsed - 0.5) / 0.5; // 0..1
      const sVal = springEase(progress, 160, 14); // Spring overshoot
      params.pupilX = 0.45 * sVal;
      params.pupilY = -0.35 * sVal;
      params.eyelidLeft = 1.15;
      params.eyelidRight = 1.15;
    } else if (elapsed >= 1.0 && elapsed < 1.6) {
      // Snap from Top-Right to Bottom-Left
      const progress = (elapsed - 1.0) / 0.6;
      const sVal = springEase(progress, 180, 15);
      params.pupilX = 0.45 - 0.9 * sVal;  // goes from 0.45 to -0.45
      params.pupilY = -0.35 + 0.6 * sVal; // goes from -0.35 to 0.25
      params.eyelidLeft = 1.2 * (1.1 - 0.1 * Math.sin(progress * Math.PI)); // rapid widen
      params.eyelidRight = 1.2 * (1.1 - 0.1 * Math.sin(progress * Math.PI));
    } else {
      // Return to center
      const progress = (elapsed - 1.6) / 0.4;
      const sVal = springEase(progress, 150, 16);
      params.pupilX = -0.45 + 0.45 * sVal;
      params.pupilY = 0.25 - 0.25 * sVal;
      params.eyelidLeft = 1.1 - 0.1 * sVal;
      params.eyelidRight = 1.1 - 0.1 * sVal;
    }
  }

  // 6. SLEEPY / DROWSY: 9.5s - 12.0s
  else if (t >= 9.5 && t < 12.0) {
    const elapsed = t - 9.5; // 0 to 2.5s
    params.highlightStyle = 'spiral';
    params.awakePercent = Math.max(0.0, 1.0 - elapsed / 2.0); // gets fully asleep by 11.5s
    
    // Micro rotation on spiral pupils to simulate spinning gears
    params.rotateAngle = elapsed * -180;

    // Blush dims gradually
    params.blushOpacity = 0.2 * params.awakePercent;
    
    // Pupils shrink under exhaustion
    params.pupilScale = Math.max(0.65, 1.15 - 0.45 * (elapsed / 2.0));

    // Slow drowsy struggle. Eyelids droop, lift slightly, droop further, then close.
    // We map elapsed (0 to 2.5) as the primary closing phase.
    let droopBase = 1.0;
    if (elapsed < 1.5) {
      // Struggle to stay open
      const struggle = 0.22 * Math.sin(elapsed * 2 * Math.PI * 1.3);
      droopBase = (1.0 - (elapsed / 1.5) * 0.5) + struggle;
    } else {
      // Sleep descends, fully close towards 2.2s
      const closeProgress = Math.min(1.0, (elapsed - 1.5) / 0.7);
      droopBase = 0.5 * (1.0 - closeProgress);
    }
    
    const eyelidsOpen = Math.max(0.0, Math.min(1.0, droopBase));
    params.eyelidLeft = eyelidsOpen;
    params.eyelidRight = eyelidsOpen;

    if (eyelidsOpen < 0.12) {
      params.eyelidLeftShape = 'closed';
      params.eyelidRightShape = 'closed';
    } else {
      params.eyelidLeftShape = 'round';
      params.eyelidRightShape = 'round';
    }

    // Pupils slowly drift downwards
    params.pupilY = 0.15 * (1.0 - params.awakePercent);
    params.pupilX = 0;

    // SLEEPING "Zzz" TEXT EFFECT
    // We start Zzz from 10.2s onwards
    if (t >= 10.2) {
      const zTime = t - 10.2; // 0..1.8s
      // Loop the Zzz bubble every 1.2s
      const bubbleIndex = Math.floor(zTime / 1.2);
      const bt = (zTime % 1.2) / 1.2; // 0..1
      
      params.zzzOpacity = bt < 0.25 ? (bt / 0.25) : (1.0 - bt) / 0.75;
      params.zzzScale = 0.4 + 0.65 * bt + 0.15 * bubbleIndex;
      params.zzzX = 35 * Math.sin(bt * 2 * Math.PI) + 15 * bubbleIndex;
      params.zzzY = -25 - bt * 80;
    }
  }

  return params;
}

/**
 * Perform a clean, smooth transition between two states.
 * This is used to ensure that scrubbing or rapid state-switching maintains 
 * extreme continuity and no raw frame pops.
 */
export function lerpEyeParams(p1: EyeParams, p2: EyeParams, factor: number): EyeParams {
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
  
  return {
    eyelidLeft: lerp(p1.eyelidLeft, p2.eyelidLeft, factor),
    eyelidRight: lerp(p1.eyelidRight, p2.eyelidRight, factor),
    eyelidLeftShape: factor < 0.5 ? p1.eyelidLeftShape : p2.eyelidLeftShape,
    eyelidRightShape: factor < 0.5 ? p1.eyelidRightShape : p2.eyelidRightShape,
    pupilX: lerp(p1.pupilX, p2.pupilX, factor),
    pupilY: lerp(p1.pupilY, p2.pupilY, factor),
    pupilScale: lerp(p1.pupilScale, p2.pupilScale, factor),
    highlightStyle: factor < 0.5 ? p1.highlightStyle : p2.highlightStyle,
    blushOpacity: lerp(p1.blushOpacity, p2.blushOpacity, factor),
    rotateAngle: lerp(p1.rotateAngle, p2.rotateAngle, factor),
    squishX: lerp(p1.squishX, p2.squishX, factor),
    squishY: lerp(p1.squishY, p2.squishY, factor),
    awakePercent: lerp(p1.awakePercent, p2.awakePercent, factor),
    zzzOpacity: lerp(p1.zzzOpacity, p2.zzzOpacity, factor),
    zzzScale: lerp(p1.zzzScale, p2.zzzScale, factor),
    zzzX: lerp(p1.zzzX, p2.zzzX, factor),
    zzzY: lerp(p1.zzzY, p2.zzzY, factor)
  };
}
