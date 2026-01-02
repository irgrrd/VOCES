
import React, { useState } from 'react';
import { GeneratedContent, ImageAnalysis, NarrativeConfig } from '../types';
import { generateIllustrativeImage } from '../services/geminiService';
import { EditScriptMaster } from '../types/moviola';
import PhotoEditorPanel from './PhotoEditorPanel';
import { Copy, X, FileCode } from 'lucide-react';

interface Props {
  content: GeneratedContent;
  onReset: () => void;
  originalImageFile: File | null;
  analysis: ImageAnalysis | null;
  config: NarrativeConfig | null;
  onRequirePremium?: () => void;
}

const ResultsView: React.FC<Props> = ({ content, onReset, originalImageFile, analysis, config, onRequirePremium }) => {
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(content.generatedImage || null);
  const [moviolaMaster, setMoviolaMaster] = useState<EditScriptMaster | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePhotoGenerate = async (settings: any) => {
    if (!config) return "";
    setIsGenerating(true);
    
    try {
        // Lógica de referencia: Si el panel envió una referencia explícita (subida allí), usala.
        // Si no, usa la imagen original subida al inicio del flujo.
        let baseImage = settings.referenceImage;
        if (!baseImage && originalImageFile) {
             const reader = new FileReader();
             baseImage = await new Promise((resolve) => {
                reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                reader.readAsDataURL(originalImageFile);
             });
        }

        // Construcción del Prompt Técnico v5
        const technicalPrompt = `${content.visualPrompt || "Cinematic scene"}. ${settings.prompt || ""}`;

        // Llamada REAL al servicio
        const base64Image = await generateIllustrativeImage(
            technicalPrompt,
            baseImage || "", // Imagen de referencia (subida o original)
            config.visionModel,
            null,
            settings.aspectRatio
        );

        setGeneratedImageUrl(base64Image);
        return base64Image;

    } catch (e: any) {
        console.error(e);
        const msg = (e.message || JSON.stringify(e)).toLowerCase();
        if (msg.includes("requested entity was not found") || msg.includes("404") || msg.includes("permission denied")) {
            alert("Error de autorización: Se requiere una API Key válida con facturación.");
            onRequirePremium?.();
        } else {
            alert("Error generando la imagen. Por favor intenta de nuevo.");
        }
        return "";
    } finally {
        setIsGenerating(false);
    }
  };

  const handleScriptGenerated = (master: EditScriptMaster) => {
    setMoviolaMaster(master);
    setShowJson(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(moviolaMaster, null, 2));
    alert("JSON copiado");
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">
        {/* Visor */}
        <div className="flex-1 bg-slate-900 p-4 flex items-center justify-center relative min-h-[50vh]">
            {generatedImageUrl ? (
                <img src={generatedImageUrl} className="max-h-full max-w-full rounded shadow-2xl object-contain" alt="Result" />
            ) : (
                <div className="text-slate-600">Esperando revelado...</div>
            )}
        </div>

        {/* Panel Lateral */}
        <div className="w-full lg:w-[380px] border-l border-slate-800 bg-slate-950 h-full overflow-hidden">
            <PhotoEditorPanel 
                analysisContext={analysis?.context}
                narrativeText={content.narrativeText}
                culturalElements={config?.culturalElements}
                initialPrompt={content.visualPrompt}
                onReveal={handlePhotoGenerate}
                onGenerateScript={handleScriptGenerated}
                isGenerating={isGenerating}
            />
        </div>

        {/* Modal JSON Moviola */}
        {showJson && moviolaMaster && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 lg:p-10 animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-lg">
                        <h3 className="font-bold text-white flex gap-2 items-center"><FileCode className="text-amber-500" /> Guion Técnico Generado</h3>
                        <button onClick={() => setShowJson(false)}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e] font-mono text-xs text-green-400">
                        <pre>{JSON.stringify(moviolaMaster, null, 2)}</pre>
                    </div>
                    <div className="p-4 border-t border-slate-700 flex justify-end bg-slate-950 rounded-b-lg">
                        <button onClick={copyToClipboard} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex gap-2 font-bold transition-colors"><Copy size={16}/> Copiar JSON</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ResultsView;
