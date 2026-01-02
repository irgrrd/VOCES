import React, { useState, useEffect } from 'react';
import { Edit3, ArrowRight, RefreshCcw, LayoutTemplate, X, Zap, MapPin, Users, ArrowLeft } from 'lucide-react';
import { ImageAnalysis } from '../types';

interface Props {
  initialText: string;
  onConfirm: (finalText: string) => void;
  onBack: () => void;
  isProcessing: boolean;
  analysis: ImageAnalysis | null;
  imagePreview: string | null;
}

const DraftEditor: React.FC<Props> = ({ initialText, onConfirm, onBack, isProcessing, analysis, imagePreview }) => {
  const [text, setText] = useState(initialText);
  const [showContext, setShowContext] = useState(true);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col lg:flex-row h-[85vh] lg:h-[75vh]">
      
      {/* Context Panel (Analyze & Compare) */}
      {showContext && analysis && (
        <div className="w-full lg:w-1/3 bg-slate-900/50 border-r border-slate-700 flex flex-col overflow-y-auto scrollbar-thin">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
             <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
               <Zap className="w-4 h-4 text-amber-500" /> Referencia Visual
             </h4>
             <button onClick={() => setShowContext(false)} className="lg:hidden text-slate-500 hover:text-white">
               <X className="w-4 h-4" />
             </button>
          </div>
          
          <div className="p-4 space-y-6">
             {imagePreview && (
               <div className="rounded-lg overflow-hidden border border-slate-700 shadow-md">
                 <img src={imagePreview} alt="Referencia" className="w-full h-auto object-cover opacity-80 hover:opacity-100 transition-opacity" />
               </div>
             )}

             <div className="space-y-4 text-xs">
                <div>
                   <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Contexto</span>
                   <p className="text-slate-300 leading-relaxed bg-slate-800 p-2 rounded border border-slate-700/50 mt-1">{analysis.context}</p>
                </div>
                <div>
                   <span className="text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Personajes</span>
                   <div className="bg-slate-800 p-2 rounded border border-slate-700/50 space-y-1 mt-1">
                      {analysis.people.personA ? <p className="text-slate-300">• {analysis.people.personA}</p> : <p className="text-slate-500 italic">Sin protagonistas claros.</p>}
                      {analysis.people.personB && <p className="text-slate-300">• {analysis.people.personB}</p>}
                   </div>
                </div>
                <div>
                   <span className="text-slate-500 font-semibold uppercase tracking-wider">Atmósfera</span>
                   <p className="text-slate-300">{analysis.atmosphere}</p>
                </div>
                 <div>
                   <span className="text-slate-500 font-semibold uppercase tracking-wider">Paleta</span>
                   <div className="flex gap-1 mt-1">{analysis.palette.map(c => <div key={c} className="w-4 h-4 rounded-full border border-slate-600" style={{backgroundColor: c}} title={c} />)}</div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-800">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-400" title="Volver a Configuración" disabled={isProcessing}><ArrowLeft className="w-5 h-5" /></button>
             {!showContext && <button onClick={() => setShowContext(true)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300" title="Mostrar Panel"><LayoutTemplate className="w-4 h-4" /></button>}
             <div>
                <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2"><Edit3 className="w-5 h-5" /> Editor de Narrativa</h3>
             </div>
          </div>
          <div className="text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded-full font-mono">{text.length} caracteres</div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-full bg-slate-800 p-6 text-slate-200 font-serif leading-relaxed text-lg focus:outline-none resize-none overflow-y-auto scrollbar-thin"
            placeholder="Escribe o edita tu narrativa aquí..."
          />
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 italic hidden sm:block">* El audio y guiones se generarán basados en este texto final.</p>
          <button
            onClick={() => onConfirm(text)}
            disabled={isProcessing || text.trim().length === 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
               <><RefreshCcw className="w-5 h-5 animate-spin" /> Generando...</>
            ) : (
               <>Finalizar y Generar <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftEditor;
