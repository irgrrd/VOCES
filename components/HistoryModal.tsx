import React from 'react';
import { HistoryItem } from '../types';
import { X, Calendar, User, FileText, Trash2, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

const HistoryModal: React.FC<Props> = ({ isOpen, onClose, history, onSelect, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-100">Bitácora de Historias</h2>
            <p className="text-sm text-slate-400">Historial local de narrativas generadas ({history.length})</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50 scrollbar-thin">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
              <FileText className="w-16 h-16 mb-4" />
              <p>No hay historias guardadas aún.</p>
              <p className="text-xs">Genera contenido para verlo aquí.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-5 transition-all group flex flex-col md:flex-row gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleDateString('es-MX', { 
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                  
                  <h3 className="font-bold text-slate-200 line-clamp-1">{item.analysis.context}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 italic">"{item.content.narrativeText.substring(0, 150)}..."</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3" /> {item.config.protagonists}
                    </span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">
                      Voz: {item.config.voiceStyle}
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col items-center justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-4">
                  <button 
                    onClick={() => onSelect(item)}
                    className="flex-1 w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    Ver / Audio <ArrowRight className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;