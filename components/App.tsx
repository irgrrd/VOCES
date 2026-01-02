
import React, { useState, useEffect } from 'react';
import { AppMode, ImageAnalysis, NarrativeConfig, GeneratedContent, PipelineState, PipelineStep, HistoryItem, SystemAssets } from '../types';
import * as geminiService from '../services/geminiService';
import * as storageService from '../services/storageService';
import { FREE_TEXT_MODELS, PREMIUM_TEXT_MODELS, VISION_MODELS } from '../constants';

import AnalysisDisplay from './AnalysisDisplay';
import ConfigForm from './ConfigForm';
import ResultsView from './ResultsView';
import HistoryModal from './HistoryModal';
import DraftEditor from './DraftEditor';
import AssetManagerModal from './AssetManagerModal';
import PremiumGate from './ApiKeyGate'; 
import { Upload, XCircle, BookOpen, Sliders, Loader, Star, Zap, ShieldCheck, Rocket, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

// --- SUB-COMPONENT: STEPPER ---
const PipelineStepper: React.FC<{ currentStep: PipelineStep }> = ({ currentStep }) => {
  const steps = [
    { id: PipelineStep.WELCOME, label: 'Modo' },
    { id: PipelineStep.ANALYSIS, label: 'Análisis' },
    { id: PipelineStep.CONFIG, label: 'Config' },
    { id: PipelineStep.DRAFT, label: 'Borrador' },
    { id: PipelineStep.MEDIA, label: 'Revelado' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        {/* Linea de fondo */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 -z-10" />
        
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isPending = currentStep < step.id;

          // Omitir paso DERIVED visualmente ya que es transicional
          if (step.id === PipelineStep.DERIVED) return null;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-950 px-2 z-10">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isActive ? 'border-amber-500 bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                  isCompleted ? 'border-emerald-500 bg-emerald-500 text-slate-900' :
                  'border-slate-700 bg-slate-900 text-slate-500'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${isActive ? 'text-amber-500' : isCompleted ? 'text-emerald-500' : 'text-slate-600'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('isPremium') === 'true';
  });
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAssetManager, setShowAssetManager] = useState(false);
  
  // Inicializamos en WELCOME para evitar crasheos y permitir selección de modo
  const [pipeline, setPipeline] = useState<PipelineState>({
    step: PipelineStep.WELCOME,
    analysisStatus: 'idle',
    draftStatus: 'idle',
    derivedStatus: 'idle',
    finalNarrativeApproved: false,
    error: null
  });

  // Estado para controlar el modo seleccionado antes de iniciar el flujo
  const [selectedMode, setSelectedMode] = useState<'standard' | 'ultra'>('standard');
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [draftNarrative, setDraftNarrative] = useState<string>('');
  const [config, setConfig] = useState<NarrativeConfig | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  
  const [systemAssets, setSystemAssets] = useState<SystemAssets>(storageService.getSystemAssets());
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    localStorage.setItem('isPremium', String(isPremium));
  }, [isPremium]);

  useEffect(() => {
    setHistory(storageService.getHistory());
  }, []);
  
  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
    setIsPremium(true);
    setShowPremiumGate(false);
    // Si estábamos en el paso WELCOME y seleccionamos Ultra, avanzamos
    if (pipeline.step === PipelineStep.WELCOME) {
         setSelectedMode('ultra');
         setPipeline(prev => ({...prev, step: PipelineStep.ANALYSIS}));
    }
  };

  const handleModeSelection = (mode: 'standard' | 'ultra') => {
      if (mode === 'ultra') {
          // Si elige ultra, verificamos/pedimos key primero
          setSelectedMode('ultra');
          // Forzamos la puerta si no estaba marcada como premium o si queremos revalidar
          setShowPremiumGate(true); 
          // La puerta se encarga de llamar a handleSelectKey, que avanzará el pipeline
      } else {
          // Modo estándar, seguro, sin key extra requerida
          setIsPremium(false);
          setSelectedMode('standard');
          setPipeline(prev => ({...prev, step: PipelineStep.ANALYSIS}));
      }
  };

  const handleApiError = (err: any) => {
    const errorMsg = (err.message || JSON.stringify(err)).toLowerCase();
    
    // Check for 404 Not Found (Requested entity was not found) or Permission issues
    if (
        errorMsg.includes("requested entity was not found") || 
        errorMsg.includes("not_found") || 
        errorMsg.includes("404") ||
        errorMsg.includes("permission denied") || 
        errorMsg.includes("api key not valid") || 
        errorMsg.includes("api_key_invalid")
    ) {
      setIsPremium(false);
      
      // If we are in Ultra mode or Premium context, prompt for key again
      if (selectedMode === 'ultra' || isPremium) {
          if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
               // Prompt user immediately as per instructions
               setTimeout(() => window.aistudio.openSelectKey(), 500);
          }
          // Optionally show the gate as fallback UI
          setShowPremiumGate(true); 
          return "Modelo no encontrado o Clave API inválida. Por favor selecciona una Clave API válida de un proyecto con facturación.";
      } else {
          setSelectedMode('standard'); // Fallback to standard
          return "Error de permisos. Se ha revertido al Modo Estándar.";
      }
    }
    return err.message || 'Error desconocido';
  };

  // --- IMAGEN OPTIMIZATION UTILS ---
  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // Optimizado para Gemini Vision (equilibrio detalle/tokens)
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
             reject(new Error("No se pudo obtener el contexto del canvas"));
             return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
             reject(new Error("Error al redimensionar imagen"));
             return;
          }
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, 'image/jpeg', 0.85); // Calidad JPEG 85% para reducir peso sin perder mucha info
      };
      img.onerror = (e) => reject(new Error("Error cargando la imagen para optimización"));
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = event.target.files?.[0];
    if (!originalFile) return;

    // Soft reset (manteniendo el modo seleccionado)
    setDraftNarrative('');
    setGeneratedContent(null);
    setAnalysis(null);

    // Feedback visual inmediato (preview temporal)
    setImagePreview(URL.createObjectURL(originalFile));
    setPipeline(prev => ({ ...prev, step: PipelineStep.ANALYSIS, analysisStatus: 'loading', error: null }));

    try {
      // 1. Optimizar imagen (Redimensionar)
      const optimizedFile = await resizeImage(originalFile);
      setSelectedImage(optimizedFile);
      
      // Actualizamos preview con la optimizada para ser consistentes
      const optimizedPreview = URL.createObjectURL(optimizedFile);
      setImagePreview(optimizedPreview);

      // 2. Analizar con Gemini
      const visionModel = VISION_MODELS[0].id; // Gemini 2.5 Flash Image (siempre rápido para análisis)
      const result = await geminiService.analyzeImage(optimizedFile, visionModel);
      setAnalysis(result);
      
      // CONFIGURACIÓN INTELIGENTE BASADA EN MODO SELECCIONADO
      const isUltra = selectedMode === 'ultra';

      const defaultConfig: NarrativeConfig = { 
        voiceStyle: 'Voz Focus Guerrero', protagonists: '', location: '', selectedTheme: '', 
        duration: '30s', culturalElements: [], formats: ['script', 'article'], audioVoice: 'neutral',
        
        // Ajustes según Modo
        narrativeDepth: isUltra ? 'deep_legacy' : 'standard', 
        textModel: isUltra ? 'gemini-3-pro-preview' : FREE_TEXT_MODELS[0].id,
        useGrounding: isUltra, // Activar búsqueda en Ultra por defecto
        
        visionModel: visionModel
      };
      setConfig(defaultConfig);

      setPipeline(prev => ({ ...prev, step: PipelineStep.CONFIG, analysisStatus: 'done' }));
    } catch (err: any) {
      const friendlyError = handleApiError(err);
      setPipeline(prev => ({ ...prev, analysisStatus: 'error', error: friendlyError, step: PipelineStep.ANALYSIS }));
    }
  };

  const handleGenerateDraft = async (cfg: NarrativeConfig) => {
    if (!analysis) return;
    setConfig(cfg);
    setPipeline(prev => ({ ...prev, draftStatus: 'loading', error: null }));
    
    try {
      const result = await geminiService.generateNarrativeDraft(analysis, cfg);
      setDraftNarrative(result.narrativeText);
      setPipeline(prev => ({ ...prev, step: PipelineStep.DRAFT, draftStatus: 'done' }));
    } catch (err: any) {
       const friendlyError = handleApiError(err);
       setPipeline(prev => ({ ...prev, draftStatus: 'error', error: friendlyError }));
    }
  };

  const handleFinalizeContent = async (finalText: string) => {
    if (!config || !analysis) return;

    setPipeline(prev => ({ ...prev, derivedStatus: 'loading', step: PipelineStep.DERIVED, error: null }));

    try {
      const extras = await geminiService.generateDerivedContent(finalText, config, analysis);
      const finalContent: GeneratedContent = { narrativeText: finalText, ...extras };

      setGeneratedContent(finalContent);
      const newHistoryItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), analysis, config, content: finalContent };
      storageService.saveToHistory(newHistoryItem);
      setHistory(prev => [newHistoryItem, ...prev]);

      setPipeline(prev => ({ ...prev, step: PipelineStep.MEDIA, derivedStatus: 'done', finalNarrativeApproved: true }));
    } catch (err: any) {
       const friendlyError = handleApiError(err);
       setPipeline(prev => ({ ...prev, derivedStatus: 'error', error: friendlyError, step: PipelineStep.DRAFT }));
    }
  };
  
  const resetApp = () => {
    // Volver al inicio completo (Welcome) para evitar estados corruptos
    setPipeline({
        step: PipelineStep.WELCOME, analysisStatus: 'idle', draftStatus: 'idle',
        derivedStatus: 'idle', finalNarrativeApproved: false, error: null
    });
    setSelectedImage(null); 
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null); 
    setAnalysis(null);
    setDraftNarrative(''); 
    setConfig(null); 
    setGeneratedContent(null);
  };

  const handleRestoreFromHistory = (item: HistoryItem) => {
    setAnalysis(item.analysis); 
    setGeneratedContent(item.content); 
    setConfig(item.config);
    setImagePreview(null);
    setSelectedImage(null);
    setPipeline({ 
        step: PipelineStep.MEDIA, analysisStatus: 'done', draftStatus: 'done',
        derivedStatus: 'done', finalNarrativeApproved: true, error: null
    });
    setShowHistoryModal(false);
  };
  
  const handleSaveAssets = (newAssets: SystemAssets) => {
    setSystemAssets(newAssets);
    storageService.saveSystemAssets(newAssets);
  };

  const handleResetAssets = () => {
    const defaults = storageService.resetSystemAssets();
    setSystemAssets(defaults);
  };

  const handleDeleteHistory = (id: string) => {
    const updated = storageService.deleteFromHistory(id);
    setHistory(updated);
  };

  return (
    <div className="min-h-screen text-slate-200 selection:bg-amber-500 selection:text-white flex flex-col font-sans pb-20 md:pb-0">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => resetApp()}>
             <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-800 rounded-lg flex items-center justify-center font-serif text-2xl font-bold text-white shadow-lg shadow-amber-900/20 group-hover:shadow-amber-900/40 transition-all">V</div>
             <div>
                <h1 className="text-lg font-serif font-bold text-slate-100 tracking-wide group-hover:text-amber-500 transition-colors">Voces de Guerrero</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                   v5.0.0 <span className="text-slate-600">•</span>
                   <span className={selectedMode === 'ultra' ? "text-amber-400 font-bold" : "text-emerald-500"}>{selectedMode === 'ultra' ? 'ULTRA' : 'STD'}</span>
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => setShowAssetManager(true)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 rounded-full transition-all" title="Gestor de Activos"><Sliders className="w-5 h-5" /></button>
             <button onClick={() => setShowHistoryModal(true)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 rounded-full transition-all relative" title="Bitácora Histórica">
                <BookOpen className="w-5 h-5" />
                {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border border-slate-900"></span>}
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        
        {/* Mostramos el Stepper si ya pasamos la bienvenida */}
        {pipeline.step > PipelineStep.WELCOME && <PipelineStepper currentStep={pipeline.step} />}

        {pipeline.error && (
            <div className="mb-6 bg-red-950/30 border border-red-500/30 text-red-200 p-4 rounded-xl flex items-center justify-between animate-shake shadow-lg backdrop-blur-sm">
                <span className="text-sm flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" /> {pipeline.error}</span>
                <button onClick={() => setPipeline(prev => ({...prev, error: null}))} className="hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
        )}

        {/* --- PANTALLA DE BIENVENIDA / SELECCIÓN DE MODO --- */}
        {pipeline.step === PipelineStep.WELCOME && (
             <div className="flex flex-col items-center justify-center min-h-[75vh] animate-fade-in space-y-12">
                 <div className="text-center space-y-4 max-w-2xl relative">
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-10" />
                    <h2 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 pb-2">Elige tu experiencia</h2>
                    <p className="text-slate-400 text-lg">Selecciona la potencia del motor narrativo antes de comenzar.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                     {/* Opción Estándar */}
                     <button 
                        onClick={() => handleModeSelection('standard')}
                        className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl text-left transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 relative overflow-hidden"
                     >
                        <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-110">
                             <ShieldCheck className="w-16 h-16 text-slate-700 group-hover:text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-200 group-hover:text-emerald-400 mb-2 font-serif">Modo Estándar</h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">Ideal para uso rápido y cotidiano. Generación ágil sin consumo extra.</p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-300">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-900/30 transition-colors"><Zap className="w-4 h-4 text-emerald-500"/></div>
                              <span>Gemini 3 Flash</span>
                           </div>
                           <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-300">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-900/30 transition-colors"><CheckCircle2 className="w-4 h-4 text-emerald-500"/></div>
                              <span>Sin costo adicional</span>
                           </div>
                        </div>
                     </button>

                     {/* Opción Ultra */}
                     <button 
                        onClick={() => handleModeSelection('ultra')}
                        className="group bg-gradient-to-br from-slate-900/80 to-amber-950/20 backdrop-blur-sm border border-amber-500/20 hover:border-amber-500/60 p-8 rounded-3xl text-left transition-all hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] hover:-translate-y-1 relative overflow-hidden"
                     >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-0 right-0 p-6 opacity-40 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-110">
                             <Rocket className="w-16 h-16 text-amber-900 group-hover:text-amber-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <h3 className="text-2xl font-bold text-slate-200 group-hover:text-amber-400 font-serif">Ultra Asistido</h3>
                            <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-lg">Premium</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed relative z-10">Máxima potencia creativa. Verifica datos reales y anima tus historias.</p>
                        <div className="space-y-3 relative z-10">
                           <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-amber-100">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors"><Star className="w-4 h-4 text-amber-500"/></div>
                              <span>Gemini 3 Pro (Reasoning)</span>
                           </div>
                           <div className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-amber-100">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors"><Rocket className="w-4 h-4 text-amber-500"/></div>
                              <span>Veo Video & Search Grounding</span>
                           </div>
                        </div>
                     </button>
                 </div>
                 
                 <div className="text-xs text-slate-600 max-w-md text-center opacity-60 hover:opacity-100 transition-opacity">
                    * El modo Ultra requiere una API Key de Google Cloud con facturación habilitada. El modo Estándar es gratuito para uso básico.
                 </div>
             </div>
        )}

        {pipeline.step === PipelineStep.ANALYSIS && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
                { pipeline.analysisStatus === 'loading' ? (
                  <>
                    <div className="w-full max-w-md aspect-video bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700 shadow-2xl">
                        {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-50" />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-amber-500 font-bold uppercase tracking-widest text-xs animate-pulse">Optimizando (1024px)</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                         <h3 className="text-xl font-bold animate-pulse text-slate-200">Analizando contexto visual...</h3>
                         <p className="text-xs text-slate-500">Gemini Vision está extrayendo patrones culturales y atmósfera.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 max-w-lg mb-8">
                        <h2 className="text-4xl font-serif font-bold text-white">Sube una imagen</h2>
                        <p className="text-slate-400">
                             El motor narrativo detectará automáticamente el contexto cultural de Guerrero.
                        </p>
                    </div>
                    <label className={`group relative flex flex-col items-center justify-center w-full max-w-xl h-72 border-2 border-dashed rounded-3xl cursor-pointer bg-slate-900/50 hover:bg-slate-800/80 transition-all duration-300 ${selectedMode === 'ultra' ? 'border-amber-500/30 hover:border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'border-slate-700 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className={`w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${selectedMode === 'ultra' ? 'group-hover:bg-amber-900/30' : 'group-hover:bg-emerald-900/30'}`}>
                                <Upload className={`w-10 h-10 ${selectedMode === 'ultra' ? 'text-amber-500' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                            </div>
                            <p className="mb-2 text-lg text-slate-300 font-serif"><span className="font-bold">Haz clic para subir</span> o arrastra</p>
                            <p className="text-xs text-slate-500">JPG, PNG (Optimizado auto. a 1024px)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <button onClick={() => setPipeline(prev => ({...prev, step: PipelineStep.WELCOME}))} className="text-xs text-slate-500 hover:text-white mt-8 flex items-center gap-1 transition-colors">
                        <ChevronRight className="w-3 h-3 rotate-180" /> Cambiar modo ({selectedMode})
                    </button>
                    {history.length > 0 && <button onClick={() => setShowHistoryModal(true)} className="mt-4 text-sm text-slate-400 hover:text-amber-500 underline flex items-center gap-2"><BookOpen className="w-4 h-4" /> Ver historias anteriores</button>}
                  </>
                )}
            </div>
        )}

        {pipeline.step === PipelineStep.CONFIG && analysis && config && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                <div className="hidden lg:block lg:col-span-1 space-y-6">
                     <div className="aspect-square rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative bg-slate-800 group">
                        {imagePreview && <img src={imagePreview} alt="Analyzed" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-4 left-4 right-4">
                            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-1 block">Análisis Completado</span>
                            <p className="text-white font-serif text-lg leading-tight line-clamp-2">{analysis.context}</p>
                        </div>
                     </div>
                     <AnalysisDisplay data={analysis} />
                </div>
                <div className="lg:col-span-2">
                    <ConfigForm 
                        config={config}
                        onConfigChange={setConfig}
                        onSubmit={() => handleGenerateDraft(config)} 
                        isProcessing={pipeline.draftStatus === 'loading'} 
                        isPremium={isPremium}
                        assets={systemAssets}
                        analysis={analysis}
                        imagePreview={imagePreview}
                    />
                </div>
            </div>
        )}
        
        {pipeline.step === PipelineStep.DRAFT && (
            <DraftEditor 
                initialText={draftNarrative} 
                onConfirm={handleFinalizeContent} 
                onBack={() => setPipeline(prev => ({ ...prev, step: PipelineStep.CONFIG }))}
                isProcessing={pipeline.derivedStatus === 'loading'}
                analysis={analysis}
                imagePreview={imagePreview}
            />
        )}
        
        {pipeline.step === PipelineStep.DERIVED && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
                 <div className="relative">
                     <div className="w-24 h-24 border-4 border-slate-800 rounded-full"></div>
                     <div className="absolute top-0 left-0 w-24 h-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
                     </div>
                 </div>
                 <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-white font-serif">Generando Derivados...</h3>
                    <p className="text-slate-400">Creando guion, artículo y prompt visual en paralelo.</p>
                 </div>
            </div>
        )}

        {pipeline.step === PipelineStep.MEDIA && generatedContent && (
            <ResultsView 
              content={generatedContent} 
              onReset={() => resetApp()}
              originalImageFile={selectedImage}
              analysis={analysis}
              config={config}
              onRequirePremium={handleSelectKey}
            />
        )}
      </main>

      <PremiumGate isOpen={showPremiumGate} onClose={() => setShowPremiumGate(false)} onSelectKey={handleSelectKey} />
      <HistoryModal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} history={history} onSelect={handleRestoreFromHistory} onDelete={handleDeleteHistory} />
      <AssetManagerModal isOpen={showAssetManager} onClose={() => setShowAssetManager(false)} currentAssets={systemAssets} onSave={handleSaveAssets} onReset={handleResetAssets} />
    </div>
  );
};

export default App;
