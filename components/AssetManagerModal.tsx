
import React, { useState, useEffect, useRef } from 'react';
import { SystemAssets, SystemAssetsV4, BaseAssetV4 } from '../types';
import { loadAssetsV4, saveAssetsV4, toLegacyAssetsView, resetAssetsV4, importAssetsV4, exportAssetsV4, slugify } from '../services/storageService';
import { X, Plus, Trash2, MapPin, Sparkles, BookOpen, Save, Download, Upload, RefreshCcw, Search, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentAssets: SystemAssets; // Legacy prop (ignored for source of truth)
  onSave: (assets: SystemAssets) => void; // Update legacy parent state
  onReset: () => void;
}

const AssetManagerModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [v4Data, setV4Data] = useState<SystemAssetsV4 | null>(null);
  const [activeTab, setActiveTab] = useState<'locations' | 'elements' | 'themes'>('locations');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setV4Data(loadAssetsV4());
      setNewItemLabel('');
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen || !v4Data) return null;

  const getList = () => {
    switch (activeTab) {
      case 'locations': return v4Data.locations;
      case 'elements': return v4Data.culturalElements;
      case 'themes': return v4Data.themes;
    }
  };

  const filteredList = getList().filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!newItemLabel.trim()) return;
    const id = slugify(newItemLabel);
    
    if (getList().some(i => i.id === id)) {
      alert('Ya existe un elemento similar.');
      return;
    }

    const newAsset: BaseAssetV4 = {
      id,
      label: newItemLabel.trim(),
      source: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newData = { ...v4Data };
    if (activeTab === 'locations') newData.locations = [newAsset, ...newData.locations];
    else if (activeTab === 'elements') newData.culturalElements = [newAsset, ...newData.culturalElements];
    else newData.themes = [newAsset, ...newData.themes];

    setV4Data(newData);
    setNewItemLabel('');
  };

  const handleToggleHide = (id: string) => {
    const toggle = (list: any[]) => list.map(i => i.id === id ? { ...i, hidden: !i.hidden } : i);
    const newData = { ...v4Data };
    if (activeTab === 'locations') newData.locations = toggle(newData.locations);
    else if (activeTab === 'elements') newData.culturalElements = toggle(newData.culturalElements);
    else newData.themes = toggle(newData.themes);
    setV4Data(newData);
  };

  const handleDelete = (id: string) => {
    const remove = (list: any[]) => list.filter(i => i.id !== id);
    const newData = { ...v4Data };
    if (activeTab === 'locations') newData.locations = remove(newData.locations);
    else if (activeTab === 'elements') newData.culturalElements = remove(newData.culturalElements);
    else newData.themes = remove(newData.themes);
    setV4Data(newData);
  };

  const handleSaveInternal = () => {
    if (v4Data) {
      saveAssetsV4(v4Data);
      onSave(toLegacyAssetsView(v4Data));
      onClose();
    }
  };

  const handleResetInternal = () => {
    if (confirm('¿Restaurar valores de fábrica?')) {
      const defaults = resetAssetsV4();
      setV4Data(defaults);
      onSave(toLegacyAssetsView(defaults));
    }
  };

  const handleExportClick = () => {
    const json = exportAssetsV4();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snac_assets_v4_${Date.now()}.json`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const merged = importAssetsV4(json, 'merge'); 
        setV4Data(merged);
        alert('Importación completada.');
      } catch (err) {
        alert('Error importando: JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Gestor de Activos (V4)</h3>
            <p className="text-xs text-slate-400">Edición de ontología y presets.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportClick} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-500" title="Exportar">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-500" title="Importar">
              <Upload className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-900">
          {[
            { id: 'locations', label: 'Lugares', icon: MapPin },
            { id: 'elements', label: 'Elementos', icon: Sparkles },
            { id: 'themes', label: 'Temas', icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 ${activeTab === tab.id ? 'border-amber-500 text-amber-500 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900 flex gap-2">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
             <input 
               type="text" 
               placeholder="Buscar..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
             />
           </div>
           <input 
             type="text" 
             placeholder="Nuevo..." 
             value={newItemLabel}
             onChange={e => setNewItemLabel(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleAdd()}
             className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
           />
           <button onClick={handleAdd} disabled={!newItemLabel} className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded disabled:opacity-50">
             <Plus className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-950/50">
           {filteredList.map(item => (
             <div key={item.id} className={`flex justify-between items-center p-3 rounded border ${item.hidden ? 'border-slate-800 bg-slate-900/30 opacity-60' : 'border-slate-700 bg-slate-800'}`}>
                <div className="flex items-center gap-3">
                   <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${item.source === 'default' ? 'border-slate-600 text-slate-500' : 'border-blue-900 text-blue-400 bg-blue-900/20'}`}>
                     {item.source === 'default' ? 'SYS' : 'USER'}
                   </span>
                   <span className="text-sm text-slate-200">{item.label}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleToggleHide(item.id)} className="p-1.5 text-slate-500 hover:text-slate-300" title={item.hidden ? "Mostrar" : "Ocultar"}>
                     {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {item.source === 'user' && (
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
             </div>
           ))}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
           <button onClick={handleResetInternal} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
             <RefreshCcw className="w-3 h-3" /> Reset
           </button>
           <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
             <button onClick={handleSaveInternal} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded flex items-center gap-2">
               <Save className="w-4 h-4" /> Guardar Cambios
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AssetManagerModal;
