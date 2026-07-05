import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Save } from 'lucide-react';
import { ShiftTemplate, ManagedColor } from '../types';
import TimeInput from './TimeInput';

interface ShiftTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ShiftTemplate[];
  managedColors: ManagedColor[];
  onSave: (templates: ShiftTemplate[]) => void;
}

const generateTemplateId = (label: string): string =>
  label.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Date.now().toString(36);

const EMPTY_NEW = { label: '', morningStart: '', morningEnd: '', afternoonStart: '', afternoonEnd: '', color: '' };

const ShiftTemplateModal: React.FC<ShiftTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  managedColors,
  onSave,
}) => {
  const [editTemplates, setEditTemplates] = useState<ShiftTemplate[]>([]);
  const [draft, setDraft] = useState(EMPTY_NEW);

  useEffect(() => {
    if (isOpen) {
      setEditTemplates(templates.map(t => ({ ...t })));
      setDraft(EMPTY_NEW);
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const updateTemplate = (id: string, patch: Partial<ShiftTemplate>) => {
    setEditTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTemplate = (id: string) => {
    setEditTemplates(prev => prev.filter(t => t.id !== id));
  };

  const addTemplate = () => {
    const label = draft.label.trim();
    if (!label) return;
    setEditTemplates(prev => [
      ...prev,
      {
        id: generateTemplateId(label),
        label,
        morningStart: draft.morningStart,
        morningEnd: draft.morningEnd,
        afternoonStart: draft.afternoonStart,
        afternoonEnd: draft.afternoonEnd,
        color: draft.color || undefined,
      },
    ]);
    setDraft(EMPTY_NEW);
  };

  const handleSave = () => {
    onSave(editTemplates);
    onClose();
  };

  const renderColorSelect = (value: string | undefined, onChange: (v: string) => void) => (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs px-1.5 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
      title="Couleur appliquée aux créneaux (sinon la couleur sélectionnée au moment du dépôt)"
    >
      <option value="">Couleur au choix</option>
      {managedColors.map(mc => (
        <option key={mc.id} value={mc.id}>{mc.label}</option>
      ))}
    </select>
  );

  const renderTimesEditor = (
    t: { morningStart: string; morningEnd: string; afternoonStart: string; afternoonEnd: string },
    onPatch: (patch: Partial<ShiftTemplate>) => void
  ) => (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase w-8">Mat</span>
        <TimeInput value={t.morningStart} onChange={(v) => onPatch({ morningStart: v })} placeholder=":" />
        <span className="text-gray-400 text-xs">-</span>
        <TimeInput value={t.morningEnd} onChange={(v) => onPatch({ morningEnd: v })} placeholder=":" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase w-8">Apm</span>
        <TimeInput value={t.afternoonStart} onChange={(v) => onPatch({ afternoonStart: v })} placeholder=":" />
        <span className="text-gray-400 text-xs">-</span>
        <TimeInput value={t.afternoonEnd} onChange={(v) => onPatch({ afternoonEnd: v })} placeholder=":" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scaleIn">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Modèles de créneaux</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {editTemplates.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <input
                type="text"
                value={t.label}
                maxLength={30}
                onChange={(e) => updateTemplate(t.id, { label: e.target.value })}
                className="w-36 text-sm font-medium px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
              {renderTimesEditor(t, (patch) => updateTemplate(t.id, patch))}
              {renderColorSelect(t.color, (v) => updateTemplate(t.id, { color: v || undefined }))}
              <button
                onClick={() => deleteTemplate(t.id)}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Supprimer ce modèle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {editTemplates.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucun modèle configuré</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Ajouter un modèle</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={draft.label}
              onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
              placeholder="Nom du modèle..."
              maxLength={30}
              className="w-36 text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {renderTimesEditor(draft, (patch) => setDraft(d => ({ ...d, ...patch })))}
            {renderColorSelect(draft.color, (v) => setDraft(d => ({ ...d, color: v })))}
            <button
              onClick={addTemplate}
              disabled={!draft.label.trim()}
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

export default ShiftTemplateModal;
