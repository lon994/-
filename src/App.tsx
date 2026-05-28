/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StudioConfig, EyeParams } from './types';
import { getEyeParamsForTime } from './animationEngine';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { StudioControls } from './components/StudioControls';
import { 
  Sparkles, 
  HelpCircle, 
  FileVideo, 
  Cpu, 
  CheckCircle, 
  Send, 
  Image as ImageIcon, 
  Bot, 
  User, 
  Loader2, 
  Plus, 
  RotateCcw, 
  BookOpen, 
  CloudLightning,
  Trash2,
  Tv
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  image?: string; // base64 representation or preview url
  timestamp: string;
  styleMeta?: {
    toyName?: string;
    animalType?: string;
    pupilColor?: string;
    irisColor?: string;
    blushColor?: string;
    fabricColor?: string;
    highlightStyle?: string;
    customSpeed?: number;
    customScale?: number;
  };
}

export default function App() {
  // Timeline State in seconds (0.0 to 12.0)
  const [time, setTime] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Setup default studio Config matching the gorgeous circular glass eye of the toy
  const [config, setConfig] = useState<StudioConfig>({
    resolution: 240,
    playbackFps: 30,
    exportFps: 15,
    pupilColor: '#0F213A',    // Rich deep navy rim matching reference
    irisColor: '#4E8FC4',     // Bright steel blue inner glow matching reference
    blushColor: '#FB7185',
    fabricColor: '#D1CAB7',   // Warm beige sand fabric skin matching reference
    showGuides: false,
    syncEyes: true,
    singleEyeMode: true,       // Default to YES: single centered eye output
    lockGlassHighlights: true, // Default to YES: lock the glossy liquid glass bubbles
    screenFormat: 'square',    // Default to standard square screen
    // AI details
    toyName: '小象波米 (Pachyderm Pomme)',
    toyExplanation: '多轴欠阻尼弹簧惯性瞳孔，搭载高对比度 3D 剔透玻璃材质高光。',
    animalType: 'Elephant',
    customSpeed: 1.0,
    customScale: 1.0,
    customBlushMax: 0.85
  });

  // AI Chat Interface states
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem('custom_eye_selected_model') || 'gemini-3.5-flash');
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => localStorage.getItem('custom_eye_endpoint') || '');
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('custom_eye_apikey') || '');
  const [customModelName, setCustomModelName] = useState<string>(() => localStorage.getItem('custom_eye_modelname') || 'deepseek-chat');
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: '你好！我是毛绒玩偶动态眼睛 AI 造型师。👋\n你可以输入我所需要渲染的动物名字、风格氛围（例如：“蒸汽朋克机械猫咪”、“朦胧梦幻白兔”），或者甚至**直接上传一张玩偶设计参考图**！\n我将为你配置顶级的 12秒物理弹簧阻尼动画，生成最协调高 contrast 的瞳孔、虹膜、腮红和面料外壳颜色配比。✨',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imgMimeType, setImgMimeType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiEndpointStatus, setApiEndpointStatus] = useState<'online' | 'offline'>('online');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested Preset Prompts for instant triggering
  const suggestions = [
    { label: '🔮 赛博树蛙', prompt: '一只俏皮活泼的赛博朋克深绿色霓虹树蛙，眼睛有一圈极具科技感的亮青色（Cyan）荧光环，瞳孔是星星或螺旋状，面料带有一点黑色碳纤维塑料感' },
    { label: '🐰 蜜桃粉兔', prompt: '一只朦胧可爱的水蜜桃粉色兔子，搭配温润的爱心状高光，双颊带上红扑扑温暖的橘粉色红晕，眼神温柔带着缓慢慵懒的呼吸' },
    { label: '🦉 朋克小鹰', prompt: '蒸汽朋克风格的古金色机械猫头鹰，眼睛主体是黄铜色，眼圈带有精密复古青铜色光环，眨眼动作干净利落，微幅过冲，闪耀剔透玻璃高光' },
    { label: '👾 外星水母', prompt: '梦幻发光的半透明太空外星水母，整体是魔幻幽深紫色，眼睛中间闪烁着柔和浅粉光，具有独特的瞳孔旋转缩放动感，非常灵动好奇' }
  ];

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  // Persist configurations
  useEffect(() => {
    localStorage.setItem('custom_eye_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('custom_eye_endpoint', customEndpoint);
  }, [customEndpoint]);

  useEffect(() => {
    localStorage.setItem('custom_eye_apikey', customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem('custom_eye_modelname', customModelName);
  }, [customModelName]);

  // Adjust playback scale post speed
  useEffect(() => {
    if (config.customSpeed) {
      setPlaybackSpeed(config.customSpeed);
    }
  }, [config.customSpeed]);

  // Precise requestAnimationFrame loop to drive timeline playback
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const elapsedSec = (now - lastTime) / 1000;
      lastTime = now;

      setTime(prev => {
        const next = prev + elapsedSec * playbackSpeed;
        return next % 12.0; // Wrap around 12.0 seconds total sequence
      });

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  // Handle image upload and convert to base64
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImgMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger Style/Animation generation based on prompt/image
  const handleGenerateEyes = async (customPrompt?: string) => {
    const promptText = customPrompt || inputText;
    if (!promptText.trim() && !selectedImage) return;

    setIsGenerating(true);
    setInputText('');

    // Append User Message to history
    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [
      ...prev,
      {
        role: 'user',
        text: promptText,
        image: selectedImage || undefined,
        timestamp: userMsgTime
      }
    ]);

    // Track active resources
    const payload = {
      prompt: promptText,
      imageBase64: selectedImage,
      imageMimeType: imgMimeType,
      customModel: selectedModel === 'custom-third-party' ? customModelName : selectedModel,
      customEndpoint: selectedModel === 'custom-third-party' ? (customEndpoint || undefined) : undefined,
      customApiKey: selectedModel === 'custom-third-party' ? (customApiKey || undefined) : undefined
    };

    // Keep base64 stored for display inside chat before purging selection
    const activeAttachedImage = selectedImage;
    setSelectedImage(null);
    setImgMimeType(null);

    try {
      // Call server backend
      const response = await fetch('/api/generate-eyes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success && data.config) {
        const gen = data.config;

        // Apply generated parameters directly
        setConfig(prev => ({
          ...prev,
          pupilColor: gen.pupilColor || prev.pupilColor,
          irisColor: gen.irisColor || prev.irisColor,
          blushColor: gen.blushColor || prev.blushColor,
          fabricColor: gen.fabricColor || prev.fabricColor,
          highlightStyle: gen.highlightStyle || prev.highlightStyle,
          singleEyeMode: (
            promptText.includes('双眼') || 
            promptText.includes('两只眼') || 
            promptText.includes('两个眼') || 
            promptText.includes('double eyes') || 
            promptText.includes('paired eyes') || 
            promptText.includes('two eyes')
          ) ? false : (
            prev.singleEyeMode || (typeof gen.singleEyeMode === 'boolean' ? gen.singleEyeMode : prev.singleEyeMode)
          ),
          lockGlassHighlights: typeof gen.lockGlassHighlights === 'boolean' ? gen.lockGlassHighlights : prev.lockGlassHighlights,
          toyName: gen.toyName || prev.toyName,
          toyExplanation: gen.explanation || prev.toyExplanation,
          animalType: gen.animalType || prev.animalType,
          customSpeed: gen.customSpeed || 1.0,
          customScale: gen.customScale || 1.0
        }));

        // Append Assistant reply
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            text: `🛠️ **已为您渲染生成新玩偶动画配比！**\n\n🎯 **新设计方案：** \`${gen.toyName || '自定义智能玩偶'}\` ✦ (${gen.animalType || '幻宠'})\n\n🎨 **艺术色彩构成：**\n• 瞳孔底色 (Eye Dominant): \`${gen.pupilColor}\`\n• 渐变虹膜 (Iris Glow): \`${gen.irisColor}\`\n• 动态红晕 (Warm Blush): \`${gen.blushColor}\`\n• 皮肤面料 (Skin Fabric): \`${gen.fabricColor}\`\n• 核心高光 (Highlight Shape): \`${gen.highlightStyle}\` \n\n🌌 **设计美感解读：**\n${gen.explanation || '这款造型完美地迎合了设计概念，通过高对比度色彩与对应的高光样式，使得玩偶既憨厚又不失聪颖。'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            styleMeta: gen
          }
        ]);

      } else {
        throw new Error(data.error || '服务器未能解析出有效的高清参数，采用鲁棒保底算法。');
      }

    } catch (err: any) {
      console.warn("API error, using local beautiful sandbox emulator:", err);
      
      // Standalone simulation fallback engine when API runs offline or key is empty
      // Provides premium customized configurations instantly
      setApiEndpointStatus('offline');
      setTimeout(() => {
        // Creative mock based on text analysis
        const isGreen = promptText.includes('绿') || promptText.includes('青') || promptText.includes('蛙') || promptText.includes('frog');
        const isPink = promptText.includes('粉') || promptText.includes('兔') || promptText.includes('桃') || promptText.includes('rabbit');
        const isOwl = promptText.includes('鹰') || promptText.includes('猫头鹰') || promptText.includes('机械') || promptText.includes('metal') || promptText.includes('owl');
        const isPurple = promptText.includes('紫') || promptText.includes('魔') || promptText.includes('水母') || promptText.includes('jellyfish');

        let simConfig = {
          toyName: 'AI 智绘灵宠 (Emerald Sprout Frog)',
          animalType: 'Frog',
          pupilColor: '#0A261D',
          irisColor: '#34D399',
          blushColor: '#10B981',
          fabricColor: '#ECFDF5',
          highlightStyle: 'spiral' as any,
          singleEyeMode: true,
          lockGlassHighlights: false,
          customScale: 1.15,
          customSpeed: 1.25,
          explanation: '由于尚未完成 Settings > Secrets 的 GEMINI_API_KEY 绑定，系统自动启动【本地离线设计师插值引擎】。为您量身定制极具生命力的翠绿霓虹萌娃眼睛，超频弹簧，动作更加机警活泼！'
        };

        if (isPink) {
          simConfig = {
            toyName: '梦幻仙子粉兔 (Peach Puff Bun-Bun)',
            animalType: 'Rabbit',
            pupilColor: '#3D0E1C',
            irisColor: '#F472B6',
            blushColor: '#FB7185',
            fabricColor: '#FFF1F2',
            highlightStyle: 'heart',
            singleEyeMode: true,
            lockGlassHighlights: true,
            customScale: 0.95,
            customSpeed: 0.85,
            explanation: '温馨水蜜桃粉兔面部，眼圈为温柔的草莓红渐变，搭配爱心高光，减慢眨动与下落惯性，模拟犯困呼吸节奏。本地引擎已成功加载！'
          };
        } else if (isOwl) {
          simConfig = {
            toyName: '古铜猫头鹰 (Vintage Steam Hoot)',
            animalType: 'Owl',
            pupilColor: '#271B11',
            irisColor: '#F59E0B',
            blushColor: '#D97706',
            fabricColor: '#FDFBF7',
            highlightStyle: 'star',
            singleEyeMode: true,
            lockGlassHighlights: true,
            customScale: 1.25,
            customSpeed: 1.1,
            explanation: '黄铜骨架猫头鹰眼部。增加了极速惊奇过冲幅度，星形高光在快速瞬眨时保持高频机械颤动。离线计算已实时载入！'
          };
        } else if (isPurple) {
          simConfig = {
            toyName: '深海霓虹水母 (Abyss Nebula Jelly)',
            animalType: 'Jellyfish',
            pupilColor: '#231442',
            irisColor: '#A78BFA',
            blushColor: '#C084FC',
            fabricColor: '#FAF5FF',
            highlightStyle: 'spiral',
            singleEyeMode: true,
            lockGlassHighlights: false,
            customScale: 1.05,
            customSpeed: 0.9,
            explanation: '深海水母款单目显示器，搭配螺旋光球，呼吸起伏时瞳孔作 360 度低速平滑逆向滑动。多轴自适应色彩已部署到位。'
          };
        }

        setConfig(prev => ({
          ...prev,
          pupilColor: simConfig.pupilColor,
          irisColor: simConfig.irisColor,
          blushColor: simConfig.blushColor,
          fabricColor: simConfig.fabricColor,
          highlightStyle: simConfig.highlightStyle,
          singleEyeMode: simConfig.singleEyeMode,
          lockGlassHighlights: simConfig.lockGlassHighlights,
          toyName: simConfig.toyName,
          toyExplanation: simConfig.explanation,
          animalType: simConfig.animalType,
          customSpeed: simConfig.customSpeed,
          customScale: simConfig.customScale
        }));

        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            text: `💡 **[本地智绘离线引擎] 已经匹配上您的意图！**\n\n🎯 **新设计方案：** \`${simConfig.toyName}\` ✦ (${simConfig.animalType})\n\n🎨 **离线色彩构成：**\n• 瞳孔底色: \`${simConfig.pupilColor}\`\n• 渐变虹膜: \`${simConfig.irisColor}\`\n• 动态红晕: \`${simConfig.blushColor}\` \n• 皮肤面料: \`${simConfig.fabricColor}\`\n• 核心高光: \`${simConfig.highlightStyle}\` \n\n⚠️ **提示：** 离线模拟器已为您即时呈现最和谐的视觉效果。若希望连接服务器进行精细模型分析，请根据提示在 Secrets 面板内填入 ` + "`GEMINI_API_KEY`" + `。`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            styleMeta: simConfig as any
          }
        ]);

      }, 1200);

    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([
      {
        role: 'assistant',
        text: '聊天历史记录已清空。您可以随时提出新玩偶眼睛的设计诉求，或上传参考图片！✨',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleApplyParamsDirectly = (meta: any) => {
    if (!meta) return;
    setConfig(prev => ({
      ...prev,
      pupilColor: meta.pupilColor || prev.pupilColor,
      irisColor: meta.irisColor || prev.irisColor,
      blushColor: meta.blushColor || prev.blushColor,
      fabricColor: meta.fabricColor || prev.fabricColor,
      highlightStyle: meta.highlightStyle || prev.highlightStyle,
      toyName: meta.toyName || prev.toyName,
      animalType: meta.animalType || prev.animalType
    }));
  };

  // Calculate parameters for active timestamp 'time' dynamically
  const baseParams: EyeParams = getEyeParamsForTime(time);
  
  // Custom Overrides from config (Pupil scale offset, blush override, sleep multiplier)
  const params: EyeParams = {
    ...baseParams,
    pupilScale: baseParams.pupilScale * (config.customScale || 1.0)
  };

  return (
    <div className="min-h-screen bg-[#F7F3F0] text-[#4A443F] flex flex-col font-sans selection:bg-[#8C8379]/30 selection:text-[#2D2A27]">
      
      {/* HEADER SECTION */}
      <header className="border-b border-[#D6CFC7] bg-[#EEE9E4]/60 backdrop-blur-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#4A443F] rounded-2xl shadow-md">
            <Sparkles className="w-5 h-5 text-[#FDA4AF] animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C8379] block mb-0.5">
              Universal Plush Toy Dynamic Eye Design Studio
            </span>
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#2D2A27] font-semibold flex items-center gap-2">
              通用毛绒玩偶动态眼睛生成系统
              <span className="text-[9px] font-mono font-medium rounded-full bg-[#8C8379]/10 text-[#4A443F] border border-[#8C8379]/30 px-2 py-0.5 not-italic">
                U-Series 2.5 Pro
              </span>
            </h1>
            <p className="text-xs text-[#5E564F]">
              AI 智能造型、参考图解析 · 12s 欠阻尼弹簧物理惯性 · 嵌入式序列帧 Exporter
            </p>
          </div>
        </div>

        {/* Live status coordinates */}
        <div className="hidden lg:flex items-center gap-5 text-xs text-[#5E564F] border-l border-[#D6CFC7] pl-5">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-[#8C8379] font-bold uppercase tracking-wider">Active Device Style</span>
            <span className="font-semibold text-[#2D2A27] flex items-center gap-1.5 mt-0.5">
              <Tv className="w-3.5 h-3.5 text-blue-600" />
              {config.toyName || '未命名智能玩偶'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-[#8C8379] font-bold uppercase tracking-wider">TIMELINE MOOD</span>
            <span className="font-serif italic text-[#2D2A27] font-bold mt-0.5 text-xs">
              {time < 1.5 ? '健康之眨' :
               time < 3.5 ? '极致卖萌' :
               time < 5.5 ? '眼珠顺滑滚动' :
               time < 7.5 ? '俏皮 wink' :
               time < 9.5 ? '萌趣好奇扫视' : '朦胧低速犯困'}
            </span>
          </div>
        </div>
      </header>

      {/* CORE CONTENT LAYOUT (3 Columns: Left: AI Chat Workstation, Center: Emulator Canvas, Right: Exporter Dashboard) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: LEFT SIDE CHAT WORKSHOP (col-span-4 on LG) */}
        <section className="col-span-1 lg:col-span-4 flex flex-col bg-[#F3EDE8] border border-[#DDD5CE] rounded-3xl overflow-hidden shadow-sm h-[700px] lg:h-[750px] sticky top-24">
          
          {/* Panel Header */}
          <div className="px-4 py-3 bg-[#EAE2DB] border-b border-[#DDD5CE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A443F] flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-[#2D2A27]" />
                AI 对接造型大师
              </span>
            </div>
            
            <button 
              onClick={handleClearHistory}
              title="清空聊天记录"
              className="p-1 hover:bg-[#E0D7CF] rounded-lg text-[#8C8379] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Model selection & API configuration */}
          <div className="p-3 bg-white/50 border-b border-[#DCD3CC] flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#8C8379] uppercase font-bold tracking-wider">对话生图/动画模型对接</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 uppercase font-mono">
                {selectedModel === 'custom-third-party' ? 'Custom API' : (apiEndpointStatus === 'online' ? 'Gemini API Active' : 'Offline Emulator')}
              </span>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  if (e.target.value === 'custom-third-party') {
                    setShowCustomConfig(true);
                  }
                }}
                className="flex-1 text-xs bg-white border border-[#D5CBC2] rounded-xl px-2.5 py-1.5 text-[#4A443F] focus:outline-none focus:ring-1 focus:ring-[#8C8379] font-medium"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (快而灵敏 - 默认)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (深度美学视觉分析)</option>
                <option value="custom-third-party">🔗 自定义第三方兼容 API 模型 (如 DeepSeek, OpenRouter, 等)</option>
                <option value="imagen-3">Imagen 3 (高对比精细原画 - 模拟渲染)</option>
                <option value="dall-e-3">DALL-E 3 (平面玩偶黑豆眼 - 模拟接口)</option>
                <option value="stable-diffusion">Stable Diffusion (赛博机械朋克 - 模拟接口)</option>
              </select>

              <button
                type="button"
                onClick={() => setShowCustomConfig(!showCustomConfig)}
                className={`p-1.5 rounded-xl border transition-all ${
                  showCustomConfig 
                    ? 'bg-[#4A443F] text-white border-[#4A443F]' 
                    : 'bg-white text-[#4A443F] border-[#D5CBC2] hover:bg-[#F3EDE8]'
                }`}
                title="配置第三方 API 参数"
              >
                ⚙️
              </button>
            </div>

            {showCustomConfig && (
              <div className="mt-1 p-3 bg-white/80 rounded-2xl border border-[#DDD5CE] flex flex-col gap-2.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-[#DDD5CE]/40 pb-1.5">
                  <span className="text-[10px] font-bold text-[#4A443F]">第三方 OpenAI 兼容 API 设置</span>
                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">持久化保存</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#8C8379] uppercase">API Base URL / Endpoint</label>
                  <input 
                    type="text"
                    placeholder="例如: https://api.deepseek.com/v1"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="text-xs bg-white border border-[#DDD5CE] rounded-lg px-2.5 py-1.5 text-[#4A443F] focus:outline-none focus:ring-1 focus:ring-[#8C8379] font-medium w-full"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#8C8379] uppercase">API Secret Key</label>
                  <input 
                    type="password"
                    placeholder="输入您的 API Key / Token"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="text-xs bg-white border border-[#DDD5CE] rounded-lg px-2.5 py-1.5 text-[#4A443F] focus:outline-none focus:ring-1 focus:ring-[#8C8379] font-mono w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#8C8379] uppercase">Model Name (模型名称)</label>
                  <input 
                    type="text"
                    placeholder="例如: deepseek-chat, gpt-4o, qwen-turbo..."
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    className="text-xs bg-white border border-[#DDD5CE] rounded-lg px-2.5 py-1.5 text-[#4A443F] focus:outline-none focus:ring-1 focus:ring-[#8C8379] font-mono w-full"
                  />
                </div>
                
                <p className="text-[9px] text-[#8C8379] leading-relaxed">
                  💡 支持任何兼容 OpenAI 协议的自定义中转站或便宜大模型（如 DeepSeek、OpenRouter、OneAPI、硅基流动等）。切换至此模型后，所有的对话方案生图皆通过您自定义的后端引擎完美渲染！
                </p>
              </div>
            )}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-[#4A443F] text-white' : 'bg-white border border-[#DDD5CE] text-[#8C8379]'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#4A443F]" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 flex flex-col gap-2 ${
                  msg.role === 'user' 
                    ? 'bg-[#2D2A27] text-[#FAF6F3] rounded-tr-none' 
                    : 'bg-white text-[#4A443F] border border-[#EBE3DC] rounded-tl-none shadow-sm'
                }`}>
                  {msg.image && (
                    <div className="relative rounded-lg overflow-hidden border border-[#D6CFC7]/50 max-h-36">
                      <img src={msg.image} alt="User Upload reference" className="w-full object-cover" />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Apply Parameters pill (for AI Assistant response) */}
                  {msg.styleMeta && (
                    <button 
                      onClick={() => handleApplyParamsDirectly(msg.styleMeta)}
                      className="mt-1 bg-amber-500 hover:bg-amber-600 font-bold text-[10px] text-white uppercase px-2 py-1.5 rounded-lg text-center transition-all inline-flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重新应用此AI配色方案
                    </button>
                  )}

                  <span className="text-[9px] text-[#A59D96] self-end mt-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 bg-white border border-[#DDD5CE] text-[#4A443F]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-3 py-3 bg-white text-[#4A443F] border border-[#EBE3DC] rounded-tl-none shadow-sm flex items-center gap-2">
                  <span className="text-xs">AI正在阅读物料、调试弹簧惯性配色...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Preset templates scrollbar */}
          <div className="px-3 py-2 border-t border-[#DCD3CC] bg-[#EAE2DB]/40">
            <div className="text-[10px] text-[#8C8379] font-bold uppercase mb-1 flex items-center gap-1 font-sans">
              <BookOpen className="w-3 h-3" />
              智能配方启发
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-300">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerateEyes(item.prompt)}
                  disabled={isGenerating}
                  className="bg-white hover:bg-amber-100 disabled:opacity-50 text-[10px] font-semibold text-[#4A443F] px-2.5 py-1.5 rounded-xl border border-[#D3C8BE] shrink-0 transition-all shadow-sm flex items-center gap-1"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form inputs */}
          <div className="p-3 bg-[#EAE2DB] border-t border-[#DDD5CE] flex flex-col gap-2.5">
            {/* Visual thumbnail profile for uploaded image */}
            {selectedImage && (
              <div className="flex items-center justify-between bg-white/80 border border-[#D3C8BE] p-1.5 rounded-xl text-[10px]">
                <div className="flex items-center gap-2">
                  <img src={selectedImage} alt="thumbnail" className="w-7 h-7 object-cover rounded" />
                  <span className="text-xs text-emerald-800 font-medium">📷 参考图分析就绪 (24bit Base64)</span>
                </div>
                <button 
                  onClick={handleClearImage}
                  className="text-red-500 hover:text-red-700 font-bold px-1.5"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImageUploadClick}
                disabled={isGenerating}
                title="上传玩偶设计参考图"
                className="bg-white hover:bg-[#DDD5CE] text-[#4A443F] p-2.5 rounded-2xl border border-[#C8BEB5] hover:border-[#8C8379] transition-all flex items-center justify-center shrink-0 active:scale-95"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateEyes();
                }}
                disabled={isGenerating}
                placeholder="给你的毛绒玩偶绘制新动画眼睛..."
                className="flex-1 text-xs bg-white border border-[#C8BEB5] rounded-2xl px-3 py-2.5 text-[#4A443F] focus:outline-none focus:ring-1 focus:ring-[#8C8379] shadow-inner"
              />

              <button
                type="button"
                onClick={() => handleGenerateEyes()}
                disabled={isGenerating || (!inputText.trim() && !selectedImage)}
                className="bg-[#4A443F] hover:bg-[#2D2A27] text-white p-2.5 rounded-2xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 active:scale-95 shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* COLUMN 2: CENTER REAL-TIME EMULATOR (col-span-4 on LG) */}
        <section className="col-span-1 lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C8379] flex items-center gap-1.5 font-sans">
              <FileVideo className="w-3.5 h-3.5 text-[#4A443F]" />
              电子玩偶仿配真机 Spec
            </span>
            <p className="text-xs text-[#5E564F] leading-relaxed">
              自适应任何形态（猫咪、熊仔、树蛙）。眼部带有欠阻尼惯性微弹力，眼神聚焦超冲，生动灵敏。
            </p>
          </div>

          <InteractiveCanvas
            time={time}
            params={params}
            config={config}
          />

          {/* AI branding / Style focus detail card */}
          <div className="bg-[#EAE2DB]/50 p-4 rounded-[24px] border border-[#DDD5CE] flex flex-col gap-1.5">
            <span className="text-[10px] text-[#8C8379] uppercase font-bold tracking-wider flex items-center gap-1">
              <CloudLightning className="w-3 h-3 text-amber-500" />
              当前活跃的 AI 设计参数 (Dynamic Spec)
            </span>
            <div className="text-xs text-[#2D2A27] font-serif italic font-bold">
              {config.toyName} (类别: {config.animalType || '幻智宠'})
            </div>
            <div className="text-[11px] text-[#5E564F] leading-relaxed">
              {config.toyExplanation}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-white/40 p-4 rounded-[24px] border border-[#E0D9D1] text-xs flex flex-col gap-2 shadow-sm">
            <span className="font-semibold text-[#2D2A27] uppercase tracking-wider text-[10px]">本帧物理计算参数 (Real-Time Kinematics)</span>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="bg-[#EEE9E4]/40 p-2 rounded-xl border border-[#D6CFC7] text-[#4A443F]">
                <div className="text-[8px] text-[#8C8379] font-bold uppercase">Eyelid Left/Right</div>
                <div className="text-[#2D2A27] font-extrabold mt-0.5">{params.eyelidLeft.toFixed(2)} / {params.eyelidRight.toFixed(2)}</div>
              </div>
              <div className="bg-[#EEE9E4]/40 p-2 rounded-xl border border-[#D6CFC7] text-[#4A443F]">
                <div className="text-[8px] text-[#8C8379] font-bold uppercase">Pupil Scale Mult</div>
                <div className="text-[#2D2A27] font-extrabold mt-0.5">x{params.pupilScale.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN 3: RIGHT SIDE WORKSPACE DASHBOARD CONTROLLER (col-span-4 on LG) */}
        <section className="col-span-1 lg:col-span-4">
          <StudioControls
            time={time}
            setTime={setTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            config={config}
            setConfig={setConfig}
            params={params}
          />
        </section>

      </main>

      {/* DESIGN SYSTEM NOTES & EXPLANATIONS */}
      <footer className="w-full mt-auto border-t border-[#D6CFC7] bg-[#EEE9E4] py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#2D2A27] flex items-center gap-1.5 uppercase font-serif italic tracking-wider">
              <Cpu className="w-4 h-4 text-[#8C8379]" />
              通用物理欠阻尼惯性体系
            </span>
            <p className="text-[11px] text-[#5E564F] leading-relaxed">
              通用版本内置高性能<b>欠阻尼阻尼弹簧（Underdamped Spring Physics）</b>渲染：瞳孔进行突发性极速扫视（Saccade）时能产生精准的<b>碰撞过冲（Overshoot）</b>余震，使玩偶极具活泼意识。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#2D2A27] flex items-center gap-1.5 uppercase font-serif italic tracking-wider">
              <Sparkles className="w-4 h-4 text-[#8C8379]" />
              AI 智能多流配比引擎
            </span>
            <p className="text-[11px] text-[#5E564F] leading-relaxed">
              对接顶级 Gemini 智能视觉识别大模型，可在文本或产品参考图中智能拆分提取眼睑、边圈、虹膜、微红晕参数，自动生成最富有个性的动态眼睛，秒级转换适配高保真 TFT 屏幕。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#2D2A27] flex items-center gap-1.5 uppercase font-serif italic tracking-wider">
              <HelpCircle className="w-4 h-4 text-[#8C8379]" />
              无缝 TFT 序列帧移植指南
            </span>
            <p className="text-[11px] text-[#5E564F] leading-relaxed">
              支持一键打包导出满轨道 12s 剔透 PNG 透明序列帧或嵌入式 C 语言静态矩阵。支持 DMA (Direct Memory Access) 直驱，能够在 ESP32 / RP2040 硬件上无缝跑满极致细腻的 30~60 FPS。
            </p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-[#D6CFC7] mt-8 pt-4 text-center text-[#8C8379] text-[10px] font-mono tracking-wider">
          AI STUDIO · Universal Plush Toy Eye-Generation Engine © 2026. All rights secured.
        </div>
      </footer>

    </div>
  );
}
