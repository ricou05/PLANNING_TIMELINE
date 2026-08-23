import React from 'react';
import { Settings, X } from 'lucide-react';
import { ManagedColor } from '../types';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  managedColors: ManagedColor[];
  onManageClick: () => void;
  showRestDayButton?: boolean;
}

// Les pastilles tiennent sur une seule ligne : le libellé de chaque rayon vit
// dans l'infobulle, et seul celui du rayon sélectionné reste écrit — c'est la
// seule information dont on a besoin en permanence (« avec quoi je peins ? »).
const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  managedColors,
  onManageClick,
  showRestDayButton = false,
}) => {
  const handleRestDayDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/rest-day', 'true');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const selected = managedColors.find((c) => c.id === selectedColor);

  return (
    <div className="flex items-center gap-2" title="Rayon appliqué aux créneaux saisis">
      <div className="flex items-center gap-1.5">
        {managedColors.map((color) => (
          <button
            key={color.id}
            onClick={() => onColorChange(color.id)}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
              selectedColor === color.id
                ? 'ring-2 ring-offset-1 ring-blue-500'
                : 'hover:scale-110'
            }`}
            style={{ backgroundColor: color.hex, borderColor: color.hex }}
            title={color.label}
            aria-label={color.label}
            aria-pressed={selectedColor === color.id}
          />
        ))}
      </div>

      {selected && (
        <span
          className="text-xs font-semibold text-gray-600 whitespace-nowrap min-w-[4rem]"
          title="Rayon actuellement sélectionné"
        >
          {selected.label}
        </span>
      )}

      <button
        onClick={onManageClick}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Gerer les couleurs"
      >
        <Settings className="w-4 h-4" />
      </button>

      {showRestDayButton && (
        <div
          draggable
          onDragStart={handleRestDayDragStart}
          className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing px-2.5 py-1 bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg hover:bg-gray-200 hover:border-gray-500 transition-colors select-none"
          title="Glisser-déposer sur une journée pour marquer un jour de repos"
        >
          <X className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-semibold text-gray-600">Repos</span>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
