/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EyeParams, StudioConfig, AnimationSection, HighlightStyle } from '../types';
import { ANIMATION_SECTIONS, TOTAL_DURATION, getEyeParamsForTime } from '../animationEngine';
import { Play, Pause, RotateCcw, Download, Eye, Layers, Settings, Code, Activity, Check, Cpu, Film } from 'lucide-react';
import JSZip from 'jszip';

interface StudioControlsProps {
  time: number;
  setTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  playbackSpeed: number;
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>;
  config: StudioConfig;
  setConfig: React.Dispatch<React.SetStateAction<StudioConfig>>;
  params: EyeParams;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  time,
  setTime,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  config,
  setConfig,
  params
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'appearance' | 'export'>('presets');
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    ANIMATION_SECTIONS.map(s => s.name)
  );

  // Get selected frame times in sequence based on selection
  const getSelectedFramesTime = (): number[] => {
    const fps = config.exportFps;
    const frameTimes: number[] = [];
    const activeSecs = ANIMATION_SECTIONS.filter(s => selectedSections.includes(s.name));
    for (const s of activeSecs) {
      const duration = s.end - s.start;
      const framesForSection = Math.round(duration * fps);
      for (let i = 0; i < framesForSection; i++) {
        frameTimes.push(s.start + (i / fps));
      }
    }
    return frameTimes;
  };

  // Quick color pallets matching standard elephant styles
  const pupilColors = [
    { label: '海洋深蓝', core: '#1E40AF', glow: '#60A5FA' },
    { label: '极夜漆黑', core: '#000000', glow: '#94A3B8' },
    { label: '翠绿翡翠', core: '#065F46', glow: '#34D399' },
    { label: '蜜糖琥珀', core: '#92400E', glow: '#FBBF24' },
    { label: '香芋魅紫', core: '#5B21B6', glow: '#C084FC' },
    { label: '活力果橙', core: '#C2410C', glow: '#FDBA74' }
  ];

  const blushColors = [
    { label: '珊瑚红晕', hex: '#FB7185' },
    { label: '玫瑰朱砂', hex: '#F43F5E' },
    { label: '蜜红微醺', hex: '#FDA4AF' },
    { label: '幻紫晚霞', hex: '#E879F9' }
  ];

  const fabricColors = [
    { label: '暖白象毛', hex: '#FDA4AF' }, // Peach pink (Elephant skin tone in video)
    { label: '经典象灰', hex: '#CBD5E1' }, // Classic gray
    { label: '罗兰风铃', hex: '#DDD6FE' }, // Soft Lavender
    { label: '香草奶黄', hex: '#FEF08A' }, // Butter yellow
    { label: '薄荷苏打', hex: '#A7F3D0' }  // Mint green
  ];

  // Helper to jump to a specific section start
  const handleJumpToSection = (section: AnimationSection) => {
    setTime(section.start);
    setIsPlaying(false);
  };

  // Triggers downloading the current frame as a high-quality standalone PNG
  const handleDownloadSingleFrame = () => {
    const canvas = document.getElementById('elephant-eye-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `elephant_eye_frame_t${time.toFixed(2)}s.png`;
    link.href = dataUrl;
    link.click();
  };

  // Triggers offline sequential render of all frames, packaging them into JSZip
  const handleExportFullSequence = async () => {
    try {
      setExportProgress(0);
      const zip = new JSZip();

      // Define target sequence specs
      const fps = config.exportFps;
      const totalFrames = Math.floor(TOTAL_DURATION * fps);

      const isPortrait = config.screenFormat === 'portrait_240_320';
      const exportW = isPortrait ? 240 : config.resolution;
      const exportH = isPortrait ? 320 : config.resolution;

      // Create an off-screen canvas to render at requested resolution
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = exportW;
      offscreenCanvas.height = exportH;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) throw new Error('Could not create off-screen canvas.');

      // Import renderer dynamically to paint on offscreen canvas
      const { drawPlushElephantFace } = await import('./EyeCanvasRenderer');

      // Loop through frames step-by-step
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = i / fps;
        const currentParams = getEyeParamsForTime(frameTime);

        // Draw current frame onto offscreen canvas
        drawPlushElephantFace(offscreenCanvas, currentParams, config, frameTime);

        // Convert offscreen canvas state to Blob
        const blob = await new Promise<Blob | null>((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          // Name the first image 1 (1).png, second 1 (2).png, etc.
          zip.file(`1 (${i + 1}).png`, blob);
        }

        // Update progress
        setExportProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      // Package everything into a downloadable zip file
      setExportProgress(98); // Packing ZIP state
      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      const filenameSize = isPortrait ? '240x320px' : `${config.resolution}px`;
      link.download = `elephant_eyes_${filenameSize}_${fps}fps_sequence.zip`;
      link.href = URL.createObjectURL(content);
      link.click();

      setExportProgress(100);
      setTimeout(() => setExportProgress(null), 1500); // clear progress
    } catch (err) {
      console.error('Sequence packaging failed:', err);
      setExportProgress(null);
    }
  };

  // Triggers sequence render of only the checked/selected segments
  const handleExportSelectedSequence = async () => {
    if (selectedSections.length === 0) {
      alert('请先选择至少一个动画组进行导出！');
      return;
    }
    try {
      setExportProgress(0);
      const zip = new JSZip();

      const fps = config.exportFps;
      const frameTimes = getSelectedFramesTime();
      const totalFrames = frameTimes.length;

      const isPortrait = config.screenFormat === 'portrait_240_320';
      const exportW = isPortrait ? 240 : config.resolution;
      const exportH = isPortrait ? 320 : config.resolution;

      // Create an off-screen canvas to render at requested resolution
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = exportW;
      offscreenCanvas.height = exportH;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) throw new Error('Could not create off-screen canvas.');

      // Import renderer dynamically to paint on offscreen canvas
      const { drawPlushElephantFace } = await import('./EyeCanvasRenderer');

      // Loop through frames step-by-step
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = frameTimes[i];
        const currentParams = getEyeParamsForTime(frameTime);

        // Draw current frame onto offscreen canvas
        drawPlushElephantFace(offscreenCanvas, currentParams, config, frameTime);

        // Convert offscreen canvas state to Blob
        const blob = await new Promise<Blob | null>((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          zip.file(`1 (${i + 1}).png`, blob);
        }

        // Update progress
        setExportProgress(Math.round(((i + 1) / totalFrames) * 95));
      }

      // Package everything into a downloadable zip file
      setExportProgress(98); // Packing ZIP state
      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      const filenameSize = isPortrait ? '240x320px' : `${config.resolution}px`;
      const selectedNames = ANIMATION_SECTIONS
        .filter(s => selectedSections.includes(s.name))
        .map(s => s.name)
        .join('_');

      link.download = `elephant_eyes_${filenameSize}_custom_selected_sequence_${selectedNames}.zip`;
      link.href = URL.createObjectURL(content);
      link.click();

      setExportProgress(100);
      setTimeout(() => setExportProgress(null), 1500); // clear progress
    } catch (err) {
      console.error('Selected sequence packaging failed:', err);
      setExportProgress(null);
    }
  };

  // Triggers offline MP4 video export of only the checked/selected segments
  const handleExportSelectedVideo = async () => {
    if (selectedSections.length === 0) {
      alert('请先选择至少一个动画组进行导出！');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      alert('您的浏览器不支持 MediaRecorder 录像 API！请使用 Chrome、Edge 或 Safari。');
      return;
    }

    try {
      setVideoProgress(0);
      const fps = config.exportFps;
      const frameTimes = getSelectedFramesTime();
      const totalFrames = frameTimes.length;

      const isPortrait = config.screenFormat === 'portrait_240_320';
      const exportW = isPortrait ? 240 : config.resolution;
      const exportH = isPortrait ? 320 : config.resolution;

      // Create a temporary canvas appended to DOM to record correctly
      const recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = exportW;
      recordingCanvas.height = exportH;
      recordingCanvas.style.position = 'fixed';
      recordingCanvas.style.left = '-9999px';
      recordingCanvas.style.top = '-9999px';
      document.body.appendChild(recordingCanvas);

      const ctx = recordingCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create recording canvas context');

      // Import renderer dynamically
      const { drawPlushElephantFace } = await import('./EyeCanvasRenderer');

      // Get stream from canvas
      const stream = recordingCanvas.captureStream(fps);
      
      // Determine output mimeType
      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const backups = [
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm',
          'video/ogg'
        ];
        for (const backup of backups) {
          if (MediaRecorder.isTypeSupported(backup)) {
            mimeType = backup;
            break;
          }
        }
      }

      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      let resolveRecord: () => void = () => {};
      const recordPromise = new Promise<void>((resolve) => {
        resolveRecord = resolve;
      });

      mediaRecorder.onstop = () => {
        resolveRecord();
      };

      // Start recording
      mediaRecorder.start();

      // Render frames
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = frameTimes[i];
        const currentParams = getEyeParamsForTime(frameTime);

        // Render face
        drawPlushElephantFace(recordingCanvas, currentParams, config, frameTime);

        // Slow down slightly to let MediaRecorder digest the stream frames properly
        await new Promise((resolve) => setTimeout(resolve, Math.max(16, 1000 / fps)));

        setVideoProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      // Stop recording
      mediaRecorder.stop();
      await recordPromise;

      // Download file
      const blob = new Blob(chunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filenameSize = isPortrait ? '240x320px' : `${config.resolution}px`;
      const selectedNames = ANIMATION_SECTIONS
        .filter(s => selectedSections.includes(s.name))
        .map(s => s.name)
        .join('_');
      
      link.download = `elephant_eyes_${filenameSize}_custom_selected_${selectedNames || 'selected'}.${ext}`;
      link.href = videoUrl;
      link.click();

      // Clean up
      document.body.removeChild(recordingCanvas);
      setVideoProgress(100);
      setTimeout(() => setVideoProgress(null), 1500);

    } catch (err) {
      console.error('Video generation failed:', err);
      setVideoProgress(null);
      alert('视频导出失败，请尝试刷新页面或降低分辨率！');
    }
  };

  // Triggers offline MP4 video export of all frames
  const handleExportVideo = async () => {
    if (typeof MediaRecorder === 'undefined') {
      alert('您的浏览器不支持 MediaRecorder 录像 API！请使用 Chrome、Edge 或 Safari。');
      return;
    }

    try {
      setVideoProgress(0);
      const fps = config.exportFps;
      const totalFrames = Math.floor(TOTAL_DURATION * fps);

      const isPortrait = config.screenFormat === 'portrait_240_320';
      const exportW = isPortrait ? 240 : config.resolution;
      const exportH = isPortrait ? 320 : config.resolution;

      // Create a temporary canvas appended to DOM to record correctly
      const recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = exportW;
      recordingCanvas.height = exportH;
      recordingCanvas.style.position = 'fixed';
      recordingCanvas.style.left = '-9999px';
      recordingCanvas.style.top = '-9999px';
      document.body.appendChild(recordingCanvas);

      const ctx = recordingCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create recording canvas context');

      // Import renderer dynamically
      const { drawPlushElephantFace } = await import('./EyeCanvasRenderer');

      // Get stream from canvas
      const stream = recordingCanvas.captureStream(fps);
      
      // Determine output mimeType
      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const backups = [
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm',
          'video/ogg'
        ];
        for (const backup of backups) {
          if (MediaRecorder.isTypeSupported(backup)) {
            mimeType = backup;
            break;
          }
        }
      }

      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      let resolveRecord: () => void = () => {};
      const recordPromise = new Promise<void>((resolve) => {
        resolveRecord = resolve;
      });

      mediaRecorder.onstop = () => {
        resolveRecord();
      };

      // Start recording
      mediaRecorder.start();

      // Render frames with tiny delay for browser event loop to grab the canvas stream state
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = i / fps;
        const currentParams = getEyeParamsForTime(frameTime);

        // Render face
        drawPlushElephantFace(recordingCanvas, currentParams, config, frameTime);

        // Slow down slightly to let MediaRecorder digest the stream frames properly
        await new Promise((resolve) => setTimeout(resolve, Math.max(16, 1000 / fps)));

        setVideoProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      // Stop recording
      mediaRecorder.stop();
      await recordPromise;

      // Download file
      const blob = new Blob(chunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filenameSize = isPortrait ? '240x320px' : `${config.resolution}px`;
      
      link.download = `elephant_eyes_${filenameSize}_${fps}fps.${ext}`;
      link.href = videoUrl;
      link.click();

      // Clean up
      document.body.removeChild(recordingCanvas);
      setVideoProgress(100);
      setTimeout(() => setVideoProgress(null), 1500);

    } catch (err) {
      console.error('Video generation failed:', err);
      setVideoProgress(null);
      alert('视频导出失败，请尝试刷新页面或降低分辨率！');
    }
  };

  // Helper to generate dynamic RGB565 C Header code for copying.
  // In microcontrollers like ESP32/Arduino, pixels are commonly represented as 16-bit counts (RGB565).
  // Providing a real example helps developers implement these animations.
  const generateRGB565Sample = () => {
    const isPortrait = config.screenFormat === 'portrait_240_320';
    const finalW = isPortrait ? 240 : config.resolution;
    const finalH = isPortrait ? 320 : config.resolution;
    return `// Plush Elephant Electronic Eyes Config Code
// Image Format: RGB565 (16-bit per pixel)
// Dimension: ${finalW}x${finalH} pixels
// Output sequences: ${Math.floor(TOTAL_DURATION * config.exportFps)} Frames @ ${config.exportFps} FPS

#ifndef _ELEPHANT_EYES_H_
#define _ELEPHANT_EYES_H_

#include <stdint.h>

// RGB565 Conversion Helper Utility
// uint16_t pixel = ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3);

// Dynamic sequence setup structure
typedef struct {
    const uint16_t* frameData;
    uint16_t width;
    uint16_t height;
} EyeFrame;

// Below is an example rendering loop for Arduino/TFT_eSPI using SPI Screens (e.g. 2.4" ST7789 TFT)
/*
#include <TFT_eSPI.h>
TFT_eSPI tft = TFT_eSPI();

void drawEyeFrame(const uint16_t* pixels, int x, int y, int w, int h) {
  tft.pushImage(x, y, w, h, pixels);
}

void loop() {
  for (int i = 0; i < ${Math.floor(TOTAL_DURATION * config.exportFps)}; i++) {
    // Read files sequence from flash/SPIFFS/SD card and print to screens
    drawEyeFrame(elephant_sequence[i], 0, 0, ${finalW}, ${finalH});
    delay(${Math.round(1000 / config.exportFps)}); // Match target ${config.exportFps} fps frequency
  }
}
*/

#endif // _ELEPHANT_EYES_H_`;
  };

  return (
    <div className="w-full bg-[#EEE9E4]/60 rounded-[36px] p-6 border border-[#E0D9D1] shadow-md flex flex-col gap-6" id="studio-dashboard">
      
      {/* 1. TIMELINE & PLAYER DECKS */}
      <div className="bg-white/50 p-6 rounded-[28px] border border-[#E0D9D1] flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#8C8379] block mb-0.5">Interactive Playhead</span>
            <h2 className="text-sm font-semibold tracking-wide text-[#2D2A27] uppercase flex items-center gap-1.5 font-sans">
              <Activity className="w-4 h-4 text-[#8C8379]" />
              12s 环绕式动画时间轴
            </h2>
          </div>
          <span className="font-mono text-xs text-[#2D2A27] bg-[#EEE9E4] px-2.5 py-1 rounded-lg border border-[#D6CFC7] font-semibold">
            {time.toFixed(3)}s / {TOTAL_DURATION.toFixed(1)}s
          </span>
        </div>

        {/* The slider scrubber */}
        <div className="relative pt-1 flex items-center">
          <input
            type="range"
            min="0"
            max={TOTAL_DURATION}
            step="0.01"
            value={time}
            onChange={(e) => {
              setTime(parseFloat(e.target.value));
              setIsPlaying(false); // Scrubbing pauses active playback
            }}
            className="w-full h-2 rounded-lg bg-[#E0D9D1] appearance-none cursor-pointer focus:outline-none accent-[#2D2A27] [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2D2A27] [&::-webkit-slider-thumb]:appearance-none"
          />
        </div>

        {/* Interactive segmented progress indicators */}
        <div className="grid grid-cols-6 gap-1.5 text-[10px] font-mono mt-1">
          {ANIMATION_SECTIONS.map((sec) => {
            const isActive = time >= sec.start && time < sec.end;
            return (
              <button
                key={sec.name}
                id={`timeline-node-${sec.name}`}
                onClick={() => handleJumpToSection(sec)}
                className={`py-2 px-1 rounded-xl text-center transition-all border outline-none ${
                  isActive
                    ? 'bg-[#2D2A27] border-transparent text-white font-bold shadow-sm scale-[1.02]'
                    : 'bg-white/40 border-[#E0D9D1]/60 text-[#5E564F] hover:text-[#2D2A27] hover:bg-white hover:border-[#8C8379]/40'
                }`}
              >
                <div className="font-sans line-clamp-1 truncate font-medium">{sec.labelChinese}</div>
                <div className="opacity-60 text-[9px]">{sec.start}s</div>
              </button>
            );
          })}
        </div>

        {/* Playback Controls & rate speeds */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-3 border-t border-[#D6CFC7]/80">
          <div className="flex items-center gap-3">
            <button
              id="player-play-toggle"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-full transition-all outline-none shadow-sm ${
                isPlaying
                  ? 'bg-[#4A443F] hover:bg-[#2D2A27] text-white flex items-center justify-center'
                  : 'bg-[#8C8379] hover:bg-[#5E564F] text-white flex items-center justify-center'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              id="player-reset-button"
              onClick={() => {
                setTime(0);
                setIsPlaying(false);
              }}
              title="重头开始"
              className="p-3 bg-white hover:bg-[#EEE9E4] text-[#4A443F] rounded-full transition-all border border-[#E0D9D1] outline-none shadow-sm"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans text-[#8C8379] font-semibold uppercase tracking-wider">播放速率:</span>
            {[0.5, 1.0, 1.5, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                  playbackSpeed === speed
                    ? 'bg-[#2D2A27] border-transparent text-white font-bold shadow-sm'
                    : 'bg-white/60 border-[#D6CFC7] text-[#5E564F] hover:text-[#2D2A27] hover:bg-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC WORKSPACE TABS */}
      <div className="flex border-b border-[#D6CFC7]/80">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-3 px-1 text-center font-serif text-sm transition-all flex items-center justify-center gap-2 border-b-2 outline-none ${
            activeTab === 'presets'
              ? 'border-[#2D2A27] text-[#2D2A27] font-bold italic'
              : 'border-transparent text-[#8C8379] hover:text-[#2D2A27]'
          }`}
        >
          <Layers className="w-4 h-4" />
          表情节点细品 ({ANIMATION_SECTIONS.length})
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-3 px-1 text-center font-serif text-sm transition-all flex items-center justify-center gap-2 border-b-2 outline-none ${
            activeTab === 'appearance'
              ? 'border-[#2D2A27] text-[#2D2A27] font-bold italic'
              : 'border-transparent text-[#8C8379] hover:text-[#2D2A27]'
          }`}
        >
          <Settings className="w-4 h-4" />
          外观与材质微调
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-3 px-1 text-center font-serif text-sm transition-all flex items-center justify-center gap-2 border-b-2 outline-none ${
            activeTab === 'export'
              ? 'border-[#2D2A27] text-[#2D2A27] font-bold italic'
              : 'border-transparent text-[#8C8379] hover:text-[#2D2A27]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          序列帧嵌入式导出
        </button>
      </div>

      {/* 3. TAB AREAS */}
      <div className="min-h-[290px] flex flex-col gap-4">
        
        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#5E564F] leading-relaxed font-medium">
              点击以下表情卡片，可直接跳转至12秒动画内的对应设计段落，观察其自然的物理惯性和衔接：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="presets-grid">
              {ANIMATION_SECTIONS.map((sec) => {
                const isSelected = time >= sec.start && time < sec.end;
                return (
                  <div
                    key={sec.name}
                    onClick={() => handleJumpToSection(sec)}
                    className={`p-3.5 rounded-[20px] border cursor-pointer text-left transition-all relative overflow-hidden group shadow-sm ${
                      isSelected
                        ? 'bg-white border-[#8C8379] ring-2 ring-[#8C8379]/10'
                        : 'bg-white/40 hover:bg-white hover:border-[#8C8379]/60 border-[#E0D9D1]'
                    }`}
                  >
                    {/* Tiny accent badge */}
                    <div 
                      className="absolute top-0 left-0 w-1 h-full"
                      style={{ backgroundColor: sec.color }}
                    />
                    
                    <div className="flex items-center justify-between mb-1 ml-1.5">
                      <span className="font-bold text-xs text-[#2D2A27] flex items-center gap-1.5">
                        {sec.labelChinese}
                        <span className="text-[9px] font-mono opacity-60 px-1.5 border border-[#D6CFC7] rounded uppercase bg-[#F7F3F0]/60">
                          {sec.name}
                        </span>
                      </span>
                      <span className="text-[10.5px] font-mono text-[#8C8379] font-semibold">
                        {sec.start}s - {sec.end}s
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E564F] ml-1.5 mt-1 leading-relaxed">
                      {sec.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: APPEARANCE CUSTOMIZER */}
        {activeTab === 'appearance' && (
          <div className="flex flex-col gap-5">
            {/* Pupil & iris Color Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#2D2A27]">
                1. 瞳孔&虹膜配色调色盘 （灵动亮晶晶）
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {pupilColors.map((color) => {
                  const isMatch = config.pupilColor === color.core;
                  return (
                    <button
                      key={color.label}
                      onClick={() => setConfig({ ...config, pupilColor: color.core, irisColor: color.glow })}
                      className={`p-2.5 rounded-2xl text-[11px] flex flex-col items-center justify-center gap-1.5 border transition-all shadow-sm ${
                        isMatch 
                          ? 'border-[#2D2A27] bg-white text-[#2D2A27] font-semibold ring-2 ring-[#2D2A27]/5' 
                          : 'border-[#E0D9D1] bg-white/40 hover:bg-white text-[#5E564F] hover:text-[#2D2A27]'
                      }`}
                    >
                      <div className="flex relative">
                        <span className="w-5 h-5 rounded-full border border-black/10 select-none shadow-inner" style={{ backgroundColor: color.core }} />
                        <span className="w-2.5 h-2.5 rounded-full border border-white/30 absolute -bottom-0.5 -right-0.5" style={{ backgroundColor: color.glow }} />
                      </div>
                      <span className="scale-90 font-sans">{color.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fabric Skin Cover Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#2D2A27]">
                  2. 玩偶大象皮肤布料 (Felt Fabric)
                </label>
                <div className="flex flex-wrap gap-2">
                  {fabricColors.map((col) => (
                    <button
                      key={col.label}
                      onClick={() => setConfig({ ...config, fabricColor: col.hex })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-sans border transition-all flex items-center gap-1.5 shadow-sm ${
                        config.fabricColor === col.hex
                          ? 'border-[#2D2A27] bg-white text-[#2D2A27] font-semibold'
                          : 'border-[#E0D9D1] hover:border-[#8C8379] bg-white/40 text-[#5E564F]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded shadow-sm" style={{ backgroundColor: col.hex }} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blush cheeks */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#2D2A27]">
                  3. 双腮红晕质感
                </label>
                <div className="flex flex-wrap gap-2">
                  {blushColors.map((col) => (
                    <button
                      key={col.label}
                      onClick={() => setConfig({ ...config, blushColor: col.hex })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-sans border transition-all flex items-center gap-1.5 shadow-sm ${
                        config.blushColor === col.hex
                          ? 'border-[#2D2A27] bg-white text-[#2D2A27] font-semibold'
                          : 'border-[#E0D9D1] hover:border-[#8C8379] bg-white/40 text-[#5E564F]'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: col.hex }} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Display and alignment configs */}
            <div className="p-4 bg-white/50 rounded-2xl border border-[#E0D9D1] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center text-xs shadow-sm">
              <span className="text-[#5E564F] font-sans font-medium">
                多轴模拟物理惯性已自动激活，提供高回弹、微颤等拟真表现。
              </span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium">
                <label className="flex items-center gap-2 cursor-pointer text-[#4A443F] hover:text-[#2D2A27] select-none text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={config.singleEyeMode}
                    onChange={(e) => setConfig({ ...config, singleEyeMode: e.target.checked })}
                    className="w-4 h-4 rounded border-[#D6CFC7] text-[#2D2A27] accent-[#2D2A27] bg-white cursor-pointer"
                  />
                  <span>单个眼睛独立输出 (单屏模式)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#4A443F] hover:text-[#2D2A27] select-none text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={config.lockGlassHighlights}
                    onChange={(e) => setConfig({ ...config, lockGlassHighlights: e.target.checked })}
                    className="w-4 h-4 rounded border-[#D6CFC7] text-[#2D2A27] accent-[#2D2A27] bg-white cursor-pointer"
                  />
                  <span>锁定参考图玻璃气泡高光</span>
                </label>

                {!config.singleEyeMode && (
                  <label className="flex items-center gap-2 cursor-pointer text-[#4A443F] hover:text-[#2D2A27] select-none text-[11.5px]">
                    <input
                      type="checkbox"
                      checked={config.syncEyes}
                      onChange={(e) => setConfig({ ...config, syncEyes: e.target.checked })}
                      className="w-4 h-4 rounded border-[#D6CFC7] text-[#2D2A27] accent-[#2D2A27] bg-white cursor-pointer"
                    />
                    <span>瞳孔同步移动</span>
                  </label>
                )}
                
                <label className="flex items-center gap-2 cursor-pointer text-[#4A443F] hover:text-[#2D2A27] select-none text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={config.showGuides}
                    onChange={(e) => setConfig({ ...config, showGuides: e.target.checked })}
                    className="w-4 h-4 rounded border-[#D6CFC7] text-[#2D2A27] accent-[#2D2A27] bg-white cursor-pointer"
                  />
                  <span>对齐中心辅助线</span>
                </label>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: EMBEDDED EXPORT */}
        {activeTab === 'export' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[#5E564F] leading-relaxed font-medium">
              根据嵌入式设备硬件（如 circular TFT-OLED GC9A01 / ST7789 等圆形彩色外接屏）的性能及存储上限，可定制帧数、解析度并一键导出全部序列帧PNG压缩包，或生成对应 RGB565 加载 C 语言代码。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Export specifications */}
              <div className="bg-white/50 p-5 rounded-[24px] border border-[#E0D9D1] flex flex-col gap-4 shadow-sm">
                <span className="text-xs font-semibold text-[#2D2A27] uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-[#8C8379]" />
                  导出规格设定
                </span>
                
                {/* Screen specifications selection */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] text-[#5E564F] font-semibold">屏幕规格与尺寸 (Screen Specifications):</span>
                  
                  {/* Segmented control for Square vs 2.4" Portrait 240x320 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfig({ ...config, screenFormat: 'square' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-sans font-semibold border transition-all ${
                        config.screenFormat !== 'portrait_240_320'
                          ? 'bg-[#2D2A27] border-transparent text-white shadow-sm'
                          : 'bg-white/50 border-[#E0D9D1] text-[#5E564F] hover:text-[#2D2A27]'
                      }`}
                    >
                      圆形/方形屏 (1:1 Square)
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, screenFormat: 'portrait_240_320' })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-sans font-semibold border transition-all ${
                        config.screenFormat === 'portrait_240_320'
                          ? 'bg-[#2D2A27] border-transparent text-white shadow-sm'
                          : 'bg-white/50 border-[#E0D9D1] text-[#5E564F] hover:text-[#2D2A27]'
                      }`}
                    >
                      2.4" 240x320 竖屏 (Portrait)
                    </button>
                  </div>

                  {config.screenFormat !== 'portrait_240_320' ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-[#8C8379] font-medium">1:1 分辨率预设 (Presets):</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[64, 128, 240, 256].map((res) => (
                          <button
                            key={res}
                            onClick={() => setConfig({ ...config, resolution: res, screenFormat: 'square' })}
                            className={`py-1 rounded-xl text-xs font-mono border transition-all ${
                              config.resolution === res && config.screenFormat !== 'portrait_240_320'
                                ? 'bg-[#4A443F] border-transparent text-white font-bold shadow-sm'
                                : 'bg-white/50 border-[#E0D9D1] text-[#5E564F] hover:text-[#2D2A27] hover:bg-white'
                            }`}
                          >
                            {res}x{res}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#EEE9E4]/50 p-2.5 rounded-xl border border-[#D6CFC7] font-mono text-[10.5px] text-[#4A443F] space-y-1">
                      <div className="text-[9px] text-[#8C8379] font-extrabold uppercase tracking-wide">真机硬件规格 (Hardware Specs)</div>
                      <div>屏幕尺寸: <span className="font-bold text-[#2D2A27]">2.4" IPS TFT (Model: T240B7)</span></div>
                      <div>输出规格: <span className="font-bold text-[#2D2A27]">240 RGB (W) x 320 (H)</span></div>
                      <div>驱动芯片 IC: <span className="font-bold text-[#2D2A27]">ST7789 (4-Line SPI)</span></div>
                    </div>
                  )}
                </div>

                {/* Target Export FPS */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#5E564F] font-semibold">目标输出帧率 (Target Sequence FPS):</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 24, 30].map((f) => (
                      <button
                        key={f}
                        onClick={() => setConfig({ ...config, exportFps: f })}
                        className={`py-1.5 rounded-xl text-xs font-mono border transition-all ${
                          config.exportFps === f
                            ? 'bg-[#2D2A27] border-transparent text-white font-bold shadow-sm'
                            : 'bg-white/50 border-[#E0D9D1] text-[#5E564F] hover:text-[#2D2A27] hover:bg-white'
                        }`}
                      >
                        {f} FPS
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#8C8379] font-sans mt-0.5 font-medium">
                    * {config.exportFps} FPS 将产生累积 {Math.round(TOTAL_DURATION * config.exportFps)} 张连续物理惯性渲染图片。
                  </span>
                </div>

                {/* ANIMATION GROUP MANUAL SELECTION */}
                <div className="flex flex-col gap-2 border-t border-[#D6CFC7]/70 pt-3.5 mt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#5E564F] font-semibold">手动选择导出动画组 (Manual Segments):</span>
                    <span className="text-[10px] font-mono font-bold bg-[#2D2A27]/5 text-[#4A443F] px-1.5 py-0.5 rounded-md">
                      已选 {selectedSections.length} / 6 组
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setSelectedSections(ANIMATION_SECTIONS.map(s => s.name))}
                      className="text-[#3B82F6] hover:text-[#2563EB] font-semibold transition-colors"
                    >
                      全选 (All)
                    </button>
                    <span className="text-[#D6CFC7]">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSections([])}
                      className="text-[#EF4444] hover:text-[#DC2626] font-semibold transition-colors"
                    >
                      清空 (None)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                    {ANIMATION_SECTIONS.map((sec) => {
                      const isChecked = selectedSections.includes(sec.name);
                      return (
                        <label
                          key={sec.name}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border text-[10.5px] cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'bg-[#FDFCFB] border-[#8C8379] text-[#2D2A27]'
                              : 'bg-white/20 border-[#E5E0DA]/80 text-[#8C8379] hover:bg-white/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedSections(selectedSections.filter(n => n !== sec.name));
                              } else {
                                setSelectedSections([...selectedSections, sec.name]);
                              }
                            }}
                            className="w-3.5 h-3.5 mt-0.5 rounded border-[#D6CFC7] text-[#2D2A27] accent-[#2D2A27] bg-white cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold font-sans flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sec.color }} />
                                {sec.labelChinese}
                              </span>
                              <span className="text-[9px] font-mono text-[#8C8379] flex-shrink-0">
                                {sec.start.toFixed(1)}s-{sec.end.toFixed(1)}s
                              </span>
                            </div>
                            <p className="text-[9.5px] text-[#8C8379]/90 mt-0.5 leading-snug truncate">
                              {sec.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col justify-between gap-3 bg-white/50 p-5 rounded-[24px] border border-[#E0D9D1] shadow-sm">
                <span className="text-xs font-semibold text-[#2D2A27] uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#8C8379]" />
                  生成与下载控制台
                </span>

                <div className="flex flex-col gap-2.5">
                  {/* BUTTON: Full 12s sequence pack */}
                  <button
                    onClick={handleExportFullSequence}
                    disabled={exportProgress !== null || videoProgress !== null}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      exportProgress !== null || videoProgress !== null
                        ? 'bg-[#D6CFC7] text-[#8C8379] cursor-not-allowed'
                        : 'bg-[#2D2A27] hover:bg-[#4A443F] text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportProgress !== null 
                      ? `制图中... ${exportProgress}%` 
                      : `一键完成 12s 满轨序列帧 ZIP (${Math.round(TOTAL_DURATION * config.exportFps)}帧)`
                    }
                  </button>

                  {/* BUTTON: MP4 12s video export */}
                  <button
                    onClick={handleExportVideo}
                    disabled={exportProgress !== null || videoProgress !== null}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      exportProgress !== null || videoProgress !== null
                        ? 'bg-[#D6CFC7] text-[#8C8379] cursor-not-allowed'
                        : 'bg-[#514339] hover:bg-[#3D322B] text-[#FAF7F5]'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    {videoProgress !== null 
                      ? `视频录制中... ${videoProgress}%` 
                      : `一键完成 12s 满轨 MP4 录制`
                    }
                  </button>

                  {/* Section-specific exporters */}
                  <div className="border-t border-[#D6CFC7]/80 pt-2.5 mt-1">
                    <span className="text-[10px] text-[#8C8379] font-semibold uppercase tracking-wider block mb-1.5">
                      选中动画块导出 (Custom Selection Export):
                    </span>
                    <div className="text-[9.5px] text-[#5E564F] font-medium leading-normal mb-2 bg-[#EEE9E4]/40 p-2 rounded-xl border border-[#D6CFC7]/60">
                      <div>共包含: <span className="font-bold text-[#2D2A27]">{selectedSections.length} 个场景</span></div>
                      <div>总帧数: <span className="font-bold text-[#2D2A27]">{getSelectedFramesTime().length} 帧 ({config.exportFps} FPS)</span></div>
                    </div>
                  </div>

                  {/* BUTTON: Selected sequence pack */}
                  <button
                    onClick={handleExportSelectedSequence}
                    disabled={exportProgress !== null || videoProgress !== null || selectedSections.length === 0}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      exportProgress !== null || videoProgress !== null || selectedSections.length === 0
                        ? 'bg-[#D6CFC7] text-[#8C8379] cursor-not-allowed'
                        : 'bg-[#4A443F] hover:bg-[#5E564F] text-white'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportProgress !== null
                      ? `制图中... ${exportProgress}%`
                      : `导出选中组序列帧 ZIP (${getSelectedFramesTime().length}帧)`
                    }
                  </button>

                  {/* BUTTON: Selected video export */}
                  <button
                    onClick={handleExportSelectedVideo}
                    disabled={exportProgress !== null || videoProgress !== null || selectedSections.length === 0}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      exportProgress !== null || videoProgress !== null || selectedSections.length === 0
                        ? 'bg-[#D6CFC7] text-[#8C8379] cursor-not-allowed'
                        : 'bg-[#7C5A43] hover:bg-[#614532] text-[#FAF7F5]'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    {videoProgress !== null
                      ? `视频录制中... ${videoProgress}%`
                      : `导出选中组 MP4 动画视频`
                    }
                  </button>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {/* BUTTON: current frame as PNG */}
                    <button
                      onClick={handleDownloadSingleFrame}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-[#EEE9E4] text-[#4A443F] text-xs font-sans font-medium transition-all border border-[#E0D9D1] flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#8C8379]" />
                      下载当前单帧
                    </button>

                    {/* BUTTON: code helper */}
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className={`py-2 px-3 rounded-xl text-xs font-sans font-medium transition-all border flex items-center justify-center gap-1.5 shadow-sm ${
                        showCode 
                          ? 'bg-[#E0D9D1] border-[#8C8379] text-[#2D2A27] font-bold' 
                          : 'bg-white border-[#E0D9D1] hover:bg-[#EEE9E4] text-[#4A443F]'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5 text-[#8C8379]" />
                      {showCode ? '收起 C 代码' : '查看 RGB565 Code'}
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-[#5E564F] leading-normal border-t border-[#D6CFC7]/80 pt-2.5 font-sans font-medium">
                  提示: 导出包格式为 24位真彩色 PNG 流。若用于 Arduino/ESP32，可直接使用本工具生成的图像并导入 python convert 脚本转换为 C-Arrays or binary files。
                </div>
              </div>

            </div>

            {/* Display generated code snippet */}
            {showCode && (
              <div className="relative mt-2">
                <pre className="p-4 bg-[#2D2A27] rounded-2xl text-[10px] font-mono text-[#EEE9E4] overflow-x-auto border border-[#4A443F] max-h-56 leading-normal shadow-inner">
                  {generateRGB565Sample()}
                </pre>
                <div className="absolute top-2.5 right-2.5 bg-[#4A443F] border border-[#5E564F] text-[#F7F3F0] font-mono text-[9px] px-2 py-0.5 rounded-lg shadow-sm">
                  C / C++ Header
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
