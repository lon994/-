/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { EyeParams, StudioConfig } from '../types';
import { drawPlushElephantFace } from './EyeCanvasRenderer';

interface InteractiveCanvasProps {
  time: number;
  params: EyeParams;
  config: StudioConfig;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  time,
  params,
  config
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use the resolution from the config to define the canvas pixel dimensions
    const isPortrait = config.screenFormat === 'portrait_240_320';
    const canvasW = isPortrait ? 240 : config.resolution;
    const canvasH = isPortrait ? 320 : config.resolution;

    if (canvas.width !== canvasW || canvas.height !== canvasH) {
      canvas.width = canvasW;
      canvas.height = canvasH;
    }

    // Redraw using our mathematical renderer
    drawPlushElephantFace(canvas, params, config, time);
  }, [time, params, config]);

  const isPortrait = config.screenFormat === 'portrait_240_320';

  return (
    <div className={`relative w-full mx-auto bg-[#EEE9E4] rounded-[40px] p-6 shadow-inner border border-[#E0D9D1] flex flex-col items-center justify-center ${
      isPortrait ? 'aspect-[3/4] max-w-[360px]' : 'aspect-square max-w-[480px]'
    }`}>
      {/* Dynamic Screen Bezier Bezier Matte simulating a smart circular screen, standard rounded toys, or generic square matrices */}
      <div 
        className={`relative w-full overflow-hidden border-[8px] border-[#2D2A27] shadow-2xl flex items-center justify-center ${
          isPortrait ? 'aspect-[3/4] rounded-[24px]' : 'aspect-square rounded-full'
        }`}
        style={{
          boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.4)',
          backgroundColor: '#1E293B'
        }}
      >
        {/* The live rendering Canvas */}
        <canvas
          id="elephant-eye-canvas"
          ref={canvasRef}
          className="w-full h-full object-contain cursor-crosshair select-none"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Glass glare effect for screen look */}
        <div className={`absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-60 ${
          isPortrait ? 'rounded-[24px]' : 'rounded-full'
        }`} />
        <div className={`absolute top-2 left-6 right-6 h-1/3 bg-gradient-to-b from-white/15 to-transparent blur-[2px] pointer-events-none scale-y-50 ${
          isPortrait ? 'rounded-[24px]' : 'rounded-full'
        }`} />
      </div>

      {/* Embedded Device Annotation Tag */}
      <div className="flex items-center justify-between w-full mt-4 px-2 font-mono text-[10px] text-[#8C8379] font-semibold">
        <span className="flex items-center gap-1.5 selection:bg-none uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8C8379] animate-pulse" />
          SYSTEM LIVE
        </span>
        <span className="tracking-wide">
          {isPortrait ? '240x320' : `${config.resolution}x${config.resolution}`} | RGB565 | {config.playbackFps} FPS
        </span>
      </div>
    </div>
  );
};
