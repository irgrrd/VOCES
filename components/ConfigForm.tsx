import React, { useState, useEffect } from 'react';
import { NarrativeConfig, PredefinedVoice, VoiceOption, SystemAssets, ImageAnalysis, NarrativeDepth } from '../types';
import { 
  FREE_TEXT_MODELS, 
  PREMIUM_TEXT_MODELS,
  GUERRERO_LOCATIONS,
  VOICE_STYLES,
  GUERRERO_CULTURAL_ELEMENTS,
  generateSuggestionsFromAnalysis,
  AnalysisSuggestions
} from '../constants';
import { Settings, Mic, Film, MapPin, PenTool, Check, Sparkles, Users, User, Zap, MessageSquare, RefreshCw, BrainCircuit, ChevronDown, ChevronUp, Cpu, Layers, Star, Lock, Globe, Search, Clock, AlertTriangle, ImageIcon } from 'lucide-react';

interface ConfigFormProps {
  config: NarrativeConfig;
  analysis?: ImageAnalysis | null;
  onConfigChange: (config: NarrativeConfig) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  isPremium: boolean;
  assets: SystemAssets;
  imagePreview?: string | null; // Nueva prop opcional para mostrar la imagen en mobile
}

interface ProtagonistState {
  name: string;
  role: 'protagonist' | 'antagonist' | 'observer' | 'victim' | 'hero';
  description: string;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, analysis, onConfigChange, onSubmit, isProcessing, isPremium, assets, imagePreview }) => {
  const [suggestions, setSuggestions] = useState<AnalysisSuggestions | null>(null);
  const [showReasoning, setShowReasoning] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [protagonistState, setProtagonistState] = useState<ProtagonistState>({
    name: '',
    role: 'protagonist',
    description: ''
  });

  const [customElement, setCustomElement] = useState('');
  
  const availableTextModels = isPremium ? [...FREE_TEXT_MODELS, ...PREMIUM_TEXT_MODELS] : FREE_TEXT_MODELS;
  const isUltraQuality = config.textModel === 'gemini-3-pro-preview';

  useEffect(() => {
    if (analysis) {
      const sugg = generateSuggestionsFromAnalysis(analysis);
      setSuggestions(sugg);

      const shouldAutofill = config.culturalElements.length === 0 || config.protagonists === '';

      if (shouldAutofill) {
        const matchedLoc = GUERRERO_LOCATIONS.find(l => l.id === sugg.suggestedLocation);
        const locLabel = matchedLoc ? matchedLoc.name : 'Chilpancingo';

        let mappedVoice = config.voiceStyle;
        const voiceStyleObj = VOICE_STYLES.find(v => v.id === sugg.suggestedVoiceStyle);
        if (voiceStyleObj) mappedVoice = voiceStyleObj.name as PredefinedVoice;

        const suggestedDesc = 
            analysis.people.personA || 
            analysis.people.personB || 
            analysis.context || 
            "";

        const mappedElements: string[] = [];
        Object.values(GUERRERO_CULTURAL_ELEMENTS).forEach((cat: any) => {
             cat.forEach((el: any) => {
                 if (sugg.suggestedCulturalElements.includes(el.id)) {
                     mappedElements.push(el.label);
                 }
             });
        });

        const newProtagonistState = {
            name: '',
            role: sugg.suggestedRole as any,
            description: suggestedDesc
        };

        setProtagonistState(newProtagonistState);
        
        onConfigChange({
            ...config,
            location: locLabel,
            voiceStyle: mappedVoice,
            culturalElements: [...new Set([...config.culturalElements, ...mappedElements])],
            narrativeDepth: config.narrativeDepth || 'deep_legacy',
            textModel: config.textModel || FREE_TEXT_MODELS[0].id
        });
      }
    }
  }, [analysis]); 

  useEffect(() => {
    if (protagonistState.name.trim() || protagonistState.description.trim()) {
      onConfigChange({ 
        ...config, 
        protagonistObject: {
            name: protagonistState.name,
            role: protagonistState.role,
            description: protagonistState.description
        }
      });
    }
  }, [protagonistState]);
  
  useEffect(() => {
    // Si el modo premium se desactiva y el modelo seleccionado es premium,
    // revertir al modelo gratuito por defecto.
    if (!isPremium && PREMIUM_TEXT_MODELS.some(m => m.id === config.textModel)) {
      onConfigChange({ ...config, textModel: FREE_TEXT_MODELS[0].id });
    }
  }, [isPremium, config.textModel, onConfigChange]);


  const toggleFormat = (format: 'script' | 'article' | 'prompt') => {
    onConfigChange({
      ...config,
      formats: config.formats.includes(format) 
        ? config.formats.filter(f => f !== format) 
        : [...config.formats, format]
    });
  };

  const toggleElement = (elemLabel: string) => {
    onConfigChange({
      ...config,
      culturalElements: config.culturalElements.includes(elemLabel)
        ? config.culturalElements.filter(e => e !== elemLabel)
        : [...config.culturalElements, elemLabel]
    });
  };

  const addCustomElement = () => {
    if (customElement && !config.culturalElements.includes(customElement)) {
      onConfigChange({ ...config, culturalElements: [...config.culturalElements, customElement] });
      setCustomElement('');
    }
  };

  const isSuggested = (val: string, type: 'location' | 'voice' | 'role' | 'element') => {
    if (!suggestions) return false;
    if (type === 'location') {
        const suggLoc = GUERRERO_LOCATIONS.find(l => l.id === suggestions.suggestedLocation);
        return suggLoc?.name === val;
    }
    if (type === 'voice') {
         const voiceStyleObj = VOICE_STYLES.find(v => v.id === suggestions.suggestedVoiceStyle);
         return voiceStyleObj?.name === val;
    }
    return false;
  };

  const handleRefreshDescription = () => {
    if (analysis) {
       const suggestedDesc = 
        analysis.people.personA || 
        analysis.people.personB || 
        analysis.context || 
        "";
      setProtagonistState(prev => ({...prev, description: suggestedDesc}));
    }
  };

  const audioVoiceOptions = [
    { id: 'neutral', label: 'Neutral', desc: 'Documental', color: 'bg-slate-700' },
    { id: 'resiliencia', label: 'Resiliencia', desc: 'Cálida', color: 'bg-amber-700' },
    { id: 'testimonio', label: 'Testimonio', desc: 'Grave', color: 'bg-stone-700' },
    { id: 'fenrir', label: 'Intensa', desc: 'Suspenso', color: 'bg-red-900' },
    { id: 'puck', label: 'Traviesa', desc: 'Sátira', color: 'bg-pink-800' },
    { id: 'aoede', label: 'Ancestral', desc: 'Leyenda', color: 'bg-emerald-800' },
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-8 animate-fade-in-up backdrop-blur-sm relative">
      
      {/* Vista Móvil: Previsualización de Imagen */}
      {imagePreview && (
          <div className="lg:hidden w-full h-40 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative mb-4">
              <img src={imagePreview} alt="Reference" className="w-full h-full object-cover opacity-80" />
              <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Imagen Optimizada
              </div>
          </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-500" /> 
          Configuración Narrativa
        </h3>
        {isPremium ? (
          <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
            <Star className="w-3 h-3" /> Modo Premium Activo
          </span>
        ) : (
          <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-600 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Modo Gratuito
          </span>
        )}
      </div>

      {/* --- SECCIÓN DE MOTOR IA (VISIBLE) --- */}
      <section className={`rounded-xl p-4 border transition-colors ${isUltraQuality ? 'bg-amber-900/10 border-amber-500/40' : 'bg-blue-900/10 border-blue-500/30'}`}>
        <label className={`text-xs font-bold flex items-center gap-2 mb-2 uppercase tracking-wider ${isUltraQuality ? 'text-amber-400' : 'text-blue-400'}`}>
           <Cpu className="w-4 h-4" /> Motor de Inteligencia Artificial
        </label>
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
               <select 
                  value={config.textModel}
                  onChange={e => onConfigChange({ ...config, textModel: e.target.value })}
                  className={`flex-1 bg-slate-950 border rounded-lg py-2 px-3 text-sm text-slate-200 outline-none shadow-lg ${isUltraQuality ? 'border-amber-500/50 focus:border-amber-400 shadow-amber-900/20' : 'border-blue-500/50 focus:border-blue-400 shadow-blue-900/20'}`}
                >
                 {availableTextModels.map(model => (
                   <option key={model.id} value={model.id}>
                     {model.name} {PREMIUM_TEXT_MODELS.some(p => p.id === model.id) ? '✨' : ''}
                   </option>
                 ))}
               </select>
            </div>
            
            {/* Descripción del modelo */}
            <div className="text-[11px] text-slate-400 leading-tight pl-1">
                {availableTextModels.find(m => m.id === config.textModel)?.desc}
            </div>

            {/* Advertencia de Ultra Quality */}
            {isUltraQuality && (
               <div className="bg-slate-950/50 border border-amber-500/20 rounded p-2 text-[10px] flex items-start gap-2 text-amber-200/80 mt-1 animate-fade-in">
                  <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <strong>Impacto en Rendimiento:</strong> El modelo Gemini 3 Pro ofrece una calidad literaria superior, pero aumenta el tiempo de generación (~10-20s adicionales) y el consumo de tokens de tu cuenta.
                  </span>
               </div>
            )}
        </div>
      </section>
      
      {/* --- SECCIÓN DE PROFUNDIDAD NARRATIVA --- */}
      <section className="bg-slate-900/30 border border-slate-700/50 rounded-xl p-4">
         <label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2 uppercase tracking-wider">
            <Layers className="w-4 h-4" /> Estilo de Narración
         </label>
         <div className="grid grid-cols-2 gap-2">
            <button
               type="button"
               onClick={() => onConfigChange({...config, narrativeDepth: 'standard'})}
               className={`p-3 rounded border text-left transition-all ${config.narrativeDepth === 'standard' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
            >
               <div className="text-xs font-bold mb-1">Ágil / Estándar</div>
               <div className={`text-[10px] ${config.narrativeDepth === 'standard' ? 'text-slate-800' : 'opacity-70'}`}>Narrativa directa, ideal para redes sociales.</div>
            </button>
            <button
               type="button"
               onClick={() => onConfigChange({...config, narrativeDepth: 'deep_legacy'})}
               className={`p-3 rounded border text-left transition-all ${config.narrativeDepth === 'deep_legacy' ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
            >
               <div className="text-xs font-bold mb-1">Profundo / Literario</div>
               <div className={`text-[10px] ${config.narrativeDepth === 'deep_legacy' ? 'text-slate-800' : 'opacity-70'}`}>Contexto rico, descriptivo y emocional (Legacy).</div>
            </button>
         </div>
      </section>

      {suggestions && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
           <div 
             className="flex justify-between items-center cursor-pointer"
             onClick={() => setShowReasoning(!showReasoning)}
           >
              <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                 <BrainCircuit className="w-4 h-4" /> Análisis de Dirección IA
              </h4>
              <button className="text-slate-400 hover:text-amber-400">
                 {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
           </div>
           
           {showReasoning && (
             <div className="mt-3 text-xs text-slate-400 space-y-2 animate-fade-in">
                <p className="italic">"{suggestions.reasoning}"</p>
                <div className="flex gap-4 pt-2 border-t border-slate-800">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Confianza</span>
                      <span className={`font-bold ${suggestions.confidenceLevel === 'high' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {suggestions.confidenceLevel.toUpperCase()}
                      </span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Atmósfera</span>
                      <span className="text-slate-300">{suggestions.suggestedMood}</span>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      <section className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
        <h3 className="text-sm font-bold text-amber-500 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Protagonistas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
             <label className="text-xs text-slate-400">Nombre / Identidad</label>
             <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ej: Don Chico, María la del mercado..."
                  value={protagonistState.name}
                  onChange={e => setProtagonistState(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 focus:border-amber-500 outline-none"
                />
             </div>
          </div>
          
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400">Rol Narrativo</label>
                {suggestions?.suggestedRole === protagonistState.role && (
                    <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-2 h-2" /> Sugerido
                    </span>
                )}
             </div>
             <select 
               value={protagonistState.role}
               onChange={e => setProtagonistState(prev => ({...prev, role: e.target.value as any}))}
               className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:border-amber-500 outline-none"
             >
                <option value="protagonist">Protagonista (Héroe/Centro)</option>
                <option value="antagonist">Antagonista (Conflicto)</option>
                <option value="observer">Observador (Testigo)</option>
                <option value="victim">Víctima (Sufridor)</option>
                <option value="hero">Héroe (Resolutivo)</option>
             </select>
          </div>

          <div className="md:col-span-2 space-y-2 relative">
             <div className="flex justify-between">
                <label className="text-xs text-slate-400">Descripción Breve (Autogenerada)</label>
                <button onClick={handleRefreshDescription} className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1">
                   <RefreshCw className="w-3 h-3" /> Restaurar IA
                </button>
             </div>
             <input 
                  type="text"
                  placeholder="Ej: 60 años, manos curtidas, mirada cansada pero amable..."
                  value={protagonistState.description}
                  onChange={e => setProtagonistState(prev => ({...prev, description: e.target.value}))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:border-amber-500 outline-none placeholder-slate-600"
                />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
               <MapPin className="w-4 h-4 text-amber-500" /> Lugar / Escenario
            </label>
            <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto pr-1 scrollbar-thin">
               {GUERRERO_LOCATIONS.map(loc => {
                 const isSelected = config.location === loc.name;
                 const suggested = isSuggested(loc.name, 'location');
                 
                 return (
                   <button
                     key={loc.id}
                     onClick={() => onConfigChange({...config, location: loc.name})}
                     className={`text-left p-2 rounded border text-xs transition-all relative ${
                       isSelected
                         ? 'bg-amber-500 text-slate-900 border-amber-500 font-bold'
                         : suggested
                            ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-200' 
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                     }`}
                   >
                     <div className="truncate flex items-center gap-1">
                        {loc.name}
                        {suggested && !isSelected && <Sparkles className="w-2 h-2 text-emerald-400" />}
                     </div>
                     {isSelected && loc.description && (
                        <div className="text-[9px] mt-1 opacity-80 leading-tight whitespace-normal">{loc.description}</div>
                     )}
                   </button>
                 )
               })}
               <input 
                  type="text"
                  placeholder="Otro lugar..."
                  value={!GUERRERO_LOCATIONS.find(l => l.name === config.location) ? config.location : ''}
                  onChange={e => onConfigChange({...config, location: e.target.value})}
                  className="col-span-2 bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 focus:border-amber-500 outline-none"
               />
            </div>
         </div>

         <div className="space-y-4">
             <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" /> Voz Discursiva
                 </label>
                 <div className="space-y-2 h-48 overflow-y-auto pr-1 scrollbar-thin">
                    {VOICE_STYLES.map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => onConfigChange({...config, voiceStyle: voice.name as PredefinedVoice})}
                        className={`w-full text-left p-2 rounded border-l-4 transition-all ${
                          config.voiceStyle === voice.name
                            ? `bg-slate-800 border-amber-500 text-slate-200 shadow`
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
                        }`}
                      >
                         <div className="text-xs font-bold flex items-center gap-1">
                             {voice.name}
                             {isSuggested(voice.name, 'voice') && <Sparkles className="w-2 h-2 text-emerald-400" />}
                         </div>
                         {config.voiceStyle === voice.name && (
                             <div className="text-[10px] text-slate-400 mt-1">{voice.description}</div>
                         )}
                      </button>
                    ))}
                 </div>
             </div>
         </div>
      </section>

      <section className="bg-slate-900/50 rounded-xl border border-slate-700 p-5 space-y-4">
         <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Elementos Culturales
         </h3>
         
         <div className="space-y-4 h-64 overflow-y-auto pr-2 scrollbar-thin">
            {Object.entries(GUERRERO_CULTURAL_ELEMENTS).map(([catKey, items]: [string, any]) => (
               <div key={catKey}>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                    {catKey}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                     {items.map((el: any) => {
                        const isSugg = suggestions?.suggestedCulturalElements.includes(el.id);
                        return (
                            <button
                              key={el.id}
                              onClick={() => toggleElement(el.label)}
                              className={`px-3 py-1 rounded-full text-xs border transition-all flex items-center gap-1 ${
                                config.culturalElements.includes(el.label)
                                  ? 'bg-amber-600 border-amber-500 text-white'
                                  : isSugg
                                    ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-200 hover:border-emerald-400'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                            >
                               {el.label}
                               {isSugg && !config.culturalElements.includes(el.label) && <Sparkles className="w-2 h-2" />}
                            </button>
                        );
                     })}
                  </div>
               </div>
            ))}
            
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
               <span className="text-xs text-slate-500">¿Falta algo?</span>
               <input 
                  type="text"
                  value={customElement}
                  onChange={e => setCustomElement(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomElement()}
                  placeholder="Escribe y presiona Enter..."
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-amber-500 outline-none w-40"
               />
               <button onClick={addCustomElement} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded">+</button>
            </div>
         </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="space-y-3">
             <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-500" /> Formatos de Salida
                </label>
             </div>
             
             <div className="space-y-2">
                <label
                  className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-all ${config.formats.includes('script') ? 'bg-slate-800 border-amber-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                   <input 
                     type="checkbox" 
                     className="hidden" 
                     checked={config.formats.includes('script')}
                     onChange={() => toggleFormat('script')}
                   />
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.formats.includes('script') ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-slate-950'}`}>
                      {config.formats.includes('script') && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                   </div>
                   <div>
                      <div className="text-sm font-bold text-slate-200">Guion Vertical</div>
                      <div className="text-[10px] text-slate-500">Guion optimizado para video vertical (TikTok/Reels). Estructura viral de ~60 segundos con ganchos visuales.</div>
                   </div>
                </label>
                <label
                  className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-all ${config.formats.includes('article') ? 'bg-slate-800 border-amber-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                   <input 
                     type="checkbox" 
                     className="hidden"
                     checked={config.formats.includes('article')}
                     onChange={() => toggleFormat('article')}
                   />
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.formats.includes('article') ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-slate-950'}`}>
                      {config.formats.includes('article') && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                   </div>
                   <div>
                      <div className="text-sm font-bold text-slate-200">Artículo Periodístico</div>
                      <div className="text-[10px] text-slate-500">Nota estilo periodístico o post de blog. Incluye titular, cuerpo estructurado y tono editorial (~400 palabras).</div>
                   </div>
                </label>

                {/* --- NUEVO TOGGLE DE GROUNDING --- */}
                <label
                  className={`p-3 rounded border cursor-pointer flex items-center gap-3 transition-all ${config.useGrounding ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                   <input 
                     type="checkbox" 
                     className="hidden"
                     checked={config.useGrounding}
                     onChange={() => onConfigChange({...config, useGrounding: !config.useGrounding})}
                   />
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.useGrounding ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-950'}`}>
                      {config.useGrounding && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                   </div>
                   <div>
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          Incluir Datos Reales <span className="text-[9px] bg-blue-500 text-white px-1 rounded flex items-center gap-0.5"><Google className="w-3 h-3 inline"/> Search</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Enriquece el artículo con datos verificados de Google Search (historia local, fechas, datos curiosos).</div>
                   </div>
                </label>
             </div>
         </div>

         <div className="space-y-3">
             <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-500" /> Voz del Narrador
             </label>
             <div className="grid grid-cols-3 gap-2">
                {audioVoiceOptions.map(v => (
                   <button
                     key={v.id}
                     onClick={() => onConfigChange({...config, audioVoice: v.id as VoiceOption})}
                     className={`p-2 rounded border relative overflow-hidden text-left transition-all ${
                       config.audioVoice === v.id 
                         ? 'border-amber-500 bg-slate-800' 
                         : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                     }`}
                   >
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${v.color}`} />
                      <div className="pl-2">
                         <div className={`text-xs font-bold ${config.audioVoice === v.id ? 'text-white' : 'text-slate-400'}`}>{v.label}</div>
                         <div className="text-[9px] text-slate-600">{v.desc}</div>
                      </div>
                   </button>
                ))}
             </div>
         </div>
      </section>

      <div className="pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isProcessing || !config.location}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Escribiendo borrador...
            </>
          ) : (
            <>
              <PenTool className="w-5 h-5" /> CREAR HISTORIA
            </>
          )}
        </button>
        {!config.location && <p className="text-xs text-red-400 text-center mt-2">Selecciona un lugar para continuar.</p>}
      </div>
    </div>
  );
};

// Simple Google Icon component since Lucide doesn't have it natively or under a generic name sometimes
const Google = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.35 11.1H12v2.8h5.305c-.276 1.355-1.125 2.502-2.3 3.2v2.7h3.7c2.175-2.002 3.4-4.945 3.4-8.3 0-.575-.05-1.125-.15-1.65l.4.25z" fill="#4285F4"/>
        <path d="M12 21c2.4 0 4.5-.8 6.1-2.1l-2.9-2.3c-.8.5-1.8.8-3.2.8-2.5 0-4.6-1.7-5.4-4l-3 .2v2.4C5.1 19.3 8.3 21 12 21z" fill="#34A853"/>
        <path d="M6.6 13.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.6 7.4C2.6 9.3 2 11.5 2 13.9s.6 4.6 1.6 6.5l3-2.4z" fill="#FBBC05"/>
        <path d="M12 5.3c1.3 0 2.5.5 3.4 1.4l2.5-2.5C16.4 2.7 14.3 1.8 12 1.8c-3.7 0-6.9 1.7-8.4 4.8l3 2.3c.8-2.3 2.9-4 5.4-4z" fill="#EA4335"/>
    </svg>
);

export default ConfigForm;