import React from 'react';
import { Key, AlertTriangle, ExternalLink, X, Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectKey: () => void;
}

const PremiumGate: React.FC<Props> = ({ isOpen, onClose, onSelectKey }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500/20 mb-6">
          <Star className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Desbloquear Modo Premium</h2>
        <p className="text-slate-400 text-sm mb-6">
          Para utilizar los modelos de IA más potentes como Gemini 3 Pro, es necesario que selecciones tu propia Clave API de un proyecto de Google Cloud con facturación habilitada.
        </p>
        <div className="bg-red-900/20 border border-red-500/30 text-red-200 text-xs p-3 rounded-lg mb-6 flex items-start gap-2 text-left">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Importante:</strong> Tu proyecto debe estar en un plan de pago ("Pay-as-you-go"). Las claves de proyectos en plan gratuito no funcionarán con los modelos premium.
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <button
            onClick={onSelectKey}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-900/20 transition-all text-base"
          >
            Seleccionar Clave API Premium
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-amber-500 underline flex items-center justify-center gap-1"
          >
            Aprende cómo habilitar la facturación <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PremiumGate;