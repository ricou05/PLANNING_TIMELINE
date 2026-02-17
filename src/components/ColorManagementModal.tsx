import React, { useState, useEffect, useRef } from 'react';
import { X, Pencil, Trash2, Plus, Save } from 'lucide-react';
import { ManagedColor } from '../types';
import { generateColorId } from '../utils/colorUtils';

interface ColorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  managedColors: ManagedColor[];
  onSave: (colors: ManagedColor[]) => void;
  onAutoSave: (colors: ManagedColor[]) => void;
  lastAutoSave: string | null;
}

const formatAutoSaveTime = (iso: string): string => {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} a ${hours}h${minutes}`;
};

const ColorManagementModal: React.FC<ColorManagementModalProps> = ({
  isOpen,
  onClose,
  managedColors,
  onSave,
  onAutoSave,
  lastAutoSave,
}) => {
  const [editColors, setEditColors] = useState<ManagedColor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newHex, setNewHex] = useState('#3B82F6');
  const [newLabel, setNewLabel] = useState('');
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditColors([...managedColors]);
      setEditingId(null);
      setNewHex('#3B82F6');
      setNewLabel('');
      setShowAutoSaveIndicator(false);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, managedColors]);

  if (!isOpen) return null;

  const triggerAutoSave = (colors: ManagedColor[]) => {
    onAutoSave(colors);
    setShowAutoSaveIndicator(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => setShowAutoSaveIndicator(false), 2000);
  };

  const handleRename = (id: string, label: string) => {
    const updated = editColors.map(c => c.id === id ? { ...c, label } : c);
    setEditColors(updated);
    triggerAutoSave(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = editColors.filter(c => c.id !== id);
    setEditColors(updated);
    triggerAutoSave(updated);
  };

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const id = generateColorId(trimmed);
    const updated = [...editColors, { id, hex: newHex, label: trimmed }];
    setEditColors(updated);
    triggerAutoSave(updated);
    setNewLabel('');
    setNewHex('#3B82F6');
  };

  const handleSave = () => {
    onSave(editColors);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scaleIn">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Gestion des couleurs</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between min-h-[24px]">
            {lastAutoSave && (
              <span className="text-xs text-gray-400">
                Sauvegarde auto : {formatAutoSaveTime(lastAutoSave)}
              </span>
            )}

            <div
              className={`text-xs font-medium text-emerald-600 transition-opacity duration-300 ${
                showAutoSaveIndicator ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Modifications sauvegardees automatiquement
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {editColors.map((color) => (
            <div
              key={color.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-md flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />

              {editingId === color.id ? (
                <input
                  type="text"
                  defaultValue={color.label}
                  autoFocus
                  maxLength={30}
                  onBlur={(e) => handleRename(color.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(color.id, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 text-sm px-3 py-1.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-700">{color.label}</span>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingId(color.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Renommer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(color.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {editColors.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucune couleur configuree</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Ajouter une couleur</p>
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer">
              <input
                type="color"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div
                className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: newHex }}
              />
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nom du libelle..."
              maxLength={30}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorManagementModal;
