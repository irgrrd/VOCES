
import React from 'react';
import { ImageAnalysis } from '../types';
import { Palette, Users, Zap, MapPin, Sparkles } from 'lucide-react';

interface Props {
  data: ImageAnalysis;
}

const AnalysisDisplay: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4 animate-fade-in">
      <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
        <Zap className="w-5 h-5" /> Contexto Visual
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <span className="font-semibold text-slate-300">Contexto:</span>
              <p className="text-slate-400 italic">{data.context}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <span className="font-semibold text-slate-300">Personas Detectadas:</span>
              <ul className="text-slate-400 list-disc list-inside">
                {data.people.personA && <li>{data.people.personA}</li>}
                {data.people.personB && <li>{data.people.personB}</li>}
                {data.people.personC && <li>{data.people.personC}</li>}
                {!data.people.personA && <li>No se detectaron protagonistas claros.</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <span className="font-semibold text-slate-300">Atmósfera:</span>
            <p className="text-slate-400">{data.atmosphere}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-300">Iluminación:</span>
            <p className="text-slate-400">{data.lighting}</p>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <div className="flex gap-2">
              {data.palette.map((color, idx) => (
                <div 
                  key={idx} 
                  className="w-6 h-6 rounded-full border border-slate-600 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
        
        {data.artisanPatterns && data.artisanPatterns.length > 0 && (
          <div className="md:col-span-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <span className="font-semibold text-slate-300">Patrones Artesanales:</span>
                <ul className="text-slate-400 list-disc list-inside">
                  {data.artisanPatterns.map((pattern, idx) => (
                    <li key={idx}>{pattern}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
