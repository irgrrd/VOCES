
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedContent, VoiceOption, ImageAnalysis, NarrativeConfig } from '../types';
import { generateSpeech, generateIllustrativeImage, generateVideoFromImage } from '../services/geminiService';
import type { AspectRatio, FilmStyle, EnginePacket, EditScriptMaster } from '../types/moviola';
import PhotoEditorPanel from './PhotoEditorPanel';
import {
  Play, Pause, Download, RefreshCw, Copy, ImageIcon,
  Loader, Maximize2, AlertTriangle, Video, Cpu, Globe, ExternalLink,
  FileCode, X, Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  content: GeneratedContent;
  onReset: () => void;
  originalImageFile: File | null;
  analysis: ImageAnalysis | null;
  config: NarrativeConfig | null;
  onRequirePremium?: () => void;
}

const ResultsView: React.FC<Props> = ({ content, onReset, originalImageFile, analysis, config, onRequirePremium }) => {
  const [activeTab, setActiveTab] = useState<'narrative' | 'studio' | 'derived'>('narrative');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('neutral');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(content.generatedImage || null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(content.generatedVideo || null);

  // MOVIOLA: ahora guardamos MASTER + packet seleccionado
  const [moviolaMaster, setMoviolaMaster] = useState<EditScriptMaster | null>(null);
  const [moviolaPacket, setMoviolaPacket] = useState<EnginePacket | null>(null);
  const [showMoviolaModal, setShowMoviolaModal] = useState(false);
  const [moviolaViewMode, setMoviolaViewMode] = useState<'master' | 'packet'>('master');

  const usedModelName = config?.textModel;

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const getWavBytes = (pcmData: Uint8Array, sampleRate: number): Uint8Array => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    const wavBytes = new Uint8Array(header.byteLength + pcmData.length);
    wavBytes.set(new Uint8Array(header), 0);
    wavBytes.set(pcmData, 44);
    return wavBytes;
  };

  const handleGenerateAudio = async () => {
    if (!content.narrativeText) return;
    setIsGeneratingAudio(true);
    setIsPlaying(false);
    try {
      const base64Data = await generateSpeech(content.narrativeText.substring(0, 2000), selectedVoice);
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const pcmBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) pcmBytes[i] = binaryString.charCodeAt(i);
      const wavBytes = getWavBytes(pcmBytes, 24000);
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    } catch (e) {
      console.error(e);
      alert("Error generando audio. Por favor intenta de nuevo.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // --- REVELADO (IMAGEN) ---
  // PhotoEditorPanel v5 manda: { aspectRatio, lens, style, referenceImage? }
  const handlePhotoEditorGenerate = async (
    prompt: string,
    settings: { aspectRatio: AspectRatio; lens: string; style: FilmStyle; referenceImage?: string }
  ) => {
    if (!config) return;
    setIsGeneratingImage(true);
    try {
      let subjectImageBase64 = '';
      if (originalImageFile) {
        const reader = new FileReader();
        subjectImageBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(originalImageFile);
        });
      }

      const base64Image = await generateIllustrativeImage(
        prompt,
        subjectImageBase64,
        config.visionModel,
        settings.referenceImage || null, // Pasamos la referencia de fondo si existe
        settings.aspectRatio
      );

      setGeneratedImageUrl(base64Image);
      content.visualPrompt = prompt;
      content.generatedImage = base64Image;
      setGeneratedVideoUrl(null);
    } catch (e: any) {
      console.error(e);
      const msg = (e.message || JSON.stringify(e)).toLowerCase();
      if (msg.includes("requested entity was not found") || msg.includes("404") || msg.includes("permission denied")) {
        alert("Error de autorización: Se requiere una API Key válida con facturación.");
        onRequirePremium?.();
      } else {
        alert("Error generando la imagen. Por favor intenta de nuevo.");
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- MOVIOLA (GUION TÉCNICO) ---
  const handleMoviolaGenerate = (master: EditScriptMaster) => {
    // Recibimos master ya compilado desde PhotoEditorPanel (importante: Moviola NO genera video)
    if (!master) return;

    setMoviolaMaster(master);

    // Seleccionamos el primer packet por defecto (si existe)
    const firstPacket = master.enginePackets && master.enginePackets.length > 0 ? master.enginePackets[0] : null;
    setMoviolaPacket(firstPacket);

    setMoviolaViewMode('master'); // por defecto mostramos el master completo (auditoría)
    setShowMoviolaModal(true);
  };

  // --- VIDEO REAL (VEO) ---
  const handleGenerateVideo = async () => {
    if (!generatedImageUrl) return;
    setIsGeneratingVideo(true);
    try {
      const base64Data = generatedImageUrl.split(',')[1];
      const videoUrl = await generateVideoFromImage(base64Data, content.visualPrompt || "Cinematic movement");
      setGeneratedVideoUrl(videoUrl);
      content.generatedVideo = videoUrl;
    } catch (e: any) {
      console.error(e);
      const msg = (e.message || JSON.stringify(e)).toLowerCase();
      if (msg.includes("requested entity was not found") || msg.includes("404") || msg.includes("not_found")) {
        alert("Error de Facturación: El modelo Veo requiere una API Key de un proyecto con facturación habilitada. Por favor selecciona una clave válida.");
        onRequirePremium?.();
      } else {
        alert(`Error generando video con Veo: ${e.message || "Error desconocido"}`);
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `voces_guerrero_arte_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (audio.paused) {
      setIsPlaying(true);
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const voiceOptions: { id: VoiceOption; label: string; desc: string }[] = [
    { id: 'neutral', label: 'Neutral', desc: 'Documental' },
    { id: 'resiliencia', label: 'Resiliencia', desc: 'Cálida' },
    { id: 'testimonio', label: 'Testimonio', desc: 'Profunda' },
    { id: 'fenrir', label: 'Intensa', desc: 'Suspense' },
    { id: 'puck', label: 'Traviesa', desc: 'Sátira' },
    { id: 'aoede', label: 'Ancestral', desc: 'Leyenda' },
  ];

  const copyJson = async (obj: any, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      alert(`${label} copiado al portapapeles`);
    } catch (e) {
      console.error(e);
      alert("No se pudo copiar. Revisa permisos del navegador.");
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-bold text-slate-100 flex items-center gap-2">
          Cuarto de Revelado <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded font-sans font-normal">v5.0</span>
        </h2>
        <div className="flex items-center gap-4">
          {usedModelName && (
            <span className="text-[10px] text-blue-400 bg-blue-900/20 border border-blue-500/30 px-2 py-1 rounded flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Motor: {usedModelName}
            </span>
          )}
          <button onClick={onReset} className="text-sm text-slate-400 hover:text-amber-500 underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Nueva Historia
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[780px]">
        {/* LEFT: MEDIA STAGE */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full relative group">
          <div className="flex-1 bg-black rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl flex items-center justify-center min-h-[400px]">
            {/* VISUALIZER */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {generatedVideoUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video src={generatedVideoUrl} controls autoPlay loop className="max-h-full max-w-full rounded shadow-lg" />
                  <button
                    onClick={() => setGeneratedVideoUrl(null)}
                    className="absolute top-0 right-0 p-2 bg-black/60 hover:bg-black/80 text-white rounded-bl-xl z-10"
                    title="Volver a Imagen"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : generatedImageUrl ? (
                <>
                  <img src={generatedImageUrl} alt="Generated Art" className="w-full h-full object-contain" />
                  {/* Overlay Controls */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 z-20">
                    <button
                      onClick={handleGenerateVideo}
                      className="p-2.5 bg-slate-900/80 hover:bg-purple-600 text-white rounded-full backdrop-blur-md shadow-lg border border-white/10 transition-colors"
                      title="Animar con Veo"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDownloadImage}
                      className="p-2.5 bg-slate-900/80 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md shadow-lg border border-white/10 transition-colors"
                      title="Descargar PNG"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => window.open(generatedImageUrl!, '_blank')}
                      className="p-2.5 bg-slate-900/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-md shadow-lg border border-white/10 transition-colors"
                      title="Ver Fullscreen"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="absolute bottom-28 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[10px] text-slate-300 pointer-events-none">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Simulación Probabilística Gemini</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 p-8 max-w-sm">
                  <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-700">
                    <ImageIcon className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-300 font-bold font-serif text-lg">Lienzo Vacío</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Configura los parámetros visuales en el panel <strong>Estudio</strong> y presiona
                      <span className="text-amber-500 font-bold"> "Revelar Imagen"</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* AUDIO DOCK */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md z-20">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-4 animate-fade-in-up">
                {!audioUrl ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
                      {isGeneratingAudio ? <Loader className="w-5 h-5 text-white animate-spin" /> : <Play className="w-5 h-5 text-white ml-1" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Generar Narración</div>
                      <div className="flex gap-2">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value as VoiceOption)}
                          className="bg-black/40 border border-white/10 text-xs text-white rounded px-2 py-1.5 focus:border-amber-500 outline-none w-full"
                          disabled={isGeneratingAudio}
                        >
                          {voiceOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label} - {v.desc}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleGenerateAudio}
                          disabled={isGeneratingAudio}
                          className="bg-slate-800 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors border border-white/5"
                        >
                          Crear
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 flex items-center justify-center transition-transform hover:scale-105 shadow-lg flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                    </button>
                    <div className="flex-1 overflow-hidden">
                      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
                      <div className="text-xs font-bold text-white truncate">Narración Generada</div>
                      <div className="text-[10px] text-amber-500 truncate">Voz: {voiceOptions.find((v) => v.id === selectedVoice)?.label}</div>
                      <div className="flex items-end gap-0.5 h-3 mt-1 opacity-50">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className={`w-1 bg-slate-200 rounded-t-sm ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: `${Math.random() * 100}%` }}></div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 border-l border-white/10 pl-2">
                      <button onClick={() => setAudioUrl(null)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white" title="Nueva voz">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* LOADERS */}
            {isGeneratingImage && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-amber-500 font-bold text-lg tracking-wider animate-pulse">Revelando Imagen...</p>
                </div>
              </div>
            )}
            {isGeneratingVideo && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-20">
                <div className="text-center p-8">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-purple-400 font-bold text-lg tracking-wider">Animando con Veo...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PANELS */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            <button
              onClick={() => setActiveTab('narrative')}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'narrative' ? 'border-amber-500 text-amber-500 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Historia
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'studio' ? 'border-blue-500 text-blue-500 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Estudio
            </button>
            <button
              onClick={() => setActiveTab('derived')}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'derived' ? 'border-emerald-500 text-emerald-500 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Derivados
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin relative bg-slate-900">
            {/* TAB: HISTORIA */}
            {activeTab === 'narrative' && (
              <div className="p-6 prose prose-invert prose-amber max-w-none text-slate-300 text-sm leading-relaxed font-serif animate-fade-in">
                <ReactMarkdown>{content.narrativeText}</ReactMarkdown>
              </div>
            )}

            {/* TAB: ESTUDIO */}
            {activeTab === 'studio' && analysis && (
              <PhotoEditorPanel
                analysisContext={analysis.context}
                narrativeText={content.narrativeText}
                culturalElements={config?.culturalElements || []}
                initialPrompt={content.visualPrompt}
                onGenerateImage={handlePhotoEditorGenerate}
                onGenerateScript={handleMoviolaGenerate}
                isGenerating={isGeneratingImage || isGeneratingVideo}
              />
            )}

            {/* TAB: DERIVADOS */}
            {activeTab === 'derived' && (
              <div className="p-6 space-y-8 animate-fade-in">
                <section>
                  <h4 className="text-xs font-bold text-pink-500 uppercase mb-2">Guion Social</h4>
                  {content.socialScript ? (
                    <div className="p-4 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-400 whitespace-pre-wrap">
                      {content.socialScript}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-xs italic">No generado.</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">Artículo de Fondo</h4>
                  {content.article ? (
                    <div className="prose prose-invert prose-emerald max-w-none text-slate-300 text-xs">
                      <ReactMarkdown>{content.article}</ReactMarkdown>
                      {content.groundingSources && content.groundingSources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Fuentes Google
                          </h5>
                          <ul className="space-y-1">
                            {content.groundingSources.map((s, i) => (
                              <li key={i}>
                                <a href={s.url} target="_blank" className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1" rel="noreferrer">
                                  <ExternalLink className="w-2 h-2" /> {s.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-xs italic">No generado.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOVIOLA */}
      {showMoviolaModal && (moviolaMaster || moviolaPacket) && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <FileCode className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Moviola · Guion Técnico</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" />
                      Master (auditoría)
                    </span>
                    {moviolaPacket?.engine && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span>
                          Packet: <span className="text-amber-400 font-bold uppercase">{moviolaPacket.engine}</span>
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMoviolaModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Toggle Master / Packet */}
            <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setMoviolaViewMode('master')}
                  className={`px-3 py-1.5 rounded border text-[10px] font-bold transition-all ${
                    moviolaViewMode === 'master'
                      ? 'bg-amber-900/20 border-amber-500/40 text-amber-100'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  VER MASTER
                </button>
                <button
                  onClick={() => setMoviolaViewMode('packet')}
                  disabled={!moviolaPacket}
                  className={`px-3 py-1.5 rounded border text-[10px] font-bold transition-all ${
                    moviolaViewMode === 'packet'
                      ? 'bg-amber-900/20 border-amber-500/40 text-amber-100'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                  } ${!moviolaPacket ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  VER PACKET
                </button>
              </div>

              {moviolaMaster?.enginePackets?.length ? (
                <select
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-amber-500"
                  value={moviolaPacket?.engine || moviolaMaster.enginePackets[0].engine}
                  onChange={(e) => {
                    const p = moviolaMaster.enginePackets.find(x => x.engine === e.target.value) || moviolaMaster.enginePackets[0];
                    setMoviolaPacket(p);
                  }}
                >
                  {moviolaMaster.enginePackets.map((p, idx) => (
                    <option key={`${p.engine}_${idx}`} value={p.engine}>
                      {p.engine} · {p.status}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] text-slate-500">Sin packets</span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-0 bg-[#1e1e1e]">
              <pre className="text-[10px] md:text-xs font-mono text-green-400 p-4 leading-relaxed">
                {moviolaViewMode === 'master'
                  ? JSON.stringify(moviolaMaster, null, 2)
                  : JSON.stringify(moviolaPacket, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-2 rounded-b-xl">
              {moviolaMaster && (
                <button
                  onClick={() => copyJson(moviolaMaster, 'Master JSON')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copiar Master
                </button>
              )}
              {moviolaPacket && (
                <button
                  onClick={() => copyJson(moviolaPacket, 'Packet JSON')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copiar Packet
                </button>
              )}
              <button
                onClick={() => setShowMoviolaModal(false)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsView;
