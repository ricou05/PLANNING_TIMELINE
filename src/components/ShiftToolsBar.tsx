import React from 'react';
import { Settings, CalendarOff, Clock } from 'lucide-react';
import { ShiftTemplate, ManagedColor } from '../types';
import { findManagedColor } from '../utils/colorUtils';

const ABSENCE_TYPES = ['Congés', 'Maladie', 'École', 'Formation'];

interface ShiftToolsBarProps {
  templates: ShiftTemplate[];
  managedColors: ManagedColor[];
  onManageTemplatesClick: () => void;
}

const templateSummary = (t: ShiftTemplate): string => {
  const parts: string[] = [];
  if (t.morningStart && t.morningEnd) parts.push(`${t.morningStart}-${t.morningEnd}`);
  if (t.afternoonStart && t.afternoonEnd) parts.push(`${t.afternoonStart}-${t.afternoonEnd}`);
  return parts.join(' / ') || 'vide';
};

// Chips glissables : modèles de créneaux et types d'absence, à déposer sur une
// journée du planning (même geste que le chip "Repos")
const ShiftToolsBar: React.FC<ShiftToolsBarProps> = ({
  templates,
  managedColors,
  onManageTemplatesClick,
}) => {
  const handleTemplateDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    e.dataTransfer.setData('application/shift-template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAbsenceDragStart = (e: React.DragEvent, label: string) => {
    e.dataTransfer.setData('application/absence', label);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Modèles :</span>
        {templates.map(t => {
          const mc = findManagedColor(managedColors, t.color);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => handleTemplateDragStart(e, t)}
              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing px-2.5 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-400 shadow-sm transition-colors select-none"
              title={`${t.label} : ${templateSummary(t)} — glisser-déposer sur une journée`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {mc && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: mc.hex }}
                />
              )}
              <span className="text-xs font-semibold text-gray-700">{t.label}</span>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{templateSummary(t)}</span>
            </div>
          );
        })}
        <button
          onClick={onManageTemplatesClick}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Gérer les modèles de créneaux"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Absences :</span>
        {ABSENCE_TYPES.map(label => (
          <div
            key={label}
            draggable
            onDragStart={(e) => handleAbsenceDragStart(e, label)}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing px-2.5 py-1 bg-amber-50 border-2 border-dashed border-amber-400 rounded-lg hover:bg-amber-100 hover:border-amber-500 transition-colors select-none"
            title={`Glisser-déposer sur une journée pour marquer : ${label} (journée entière ou demi-journée)`}
          >
            <CalendarOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShiftToolsBar;
