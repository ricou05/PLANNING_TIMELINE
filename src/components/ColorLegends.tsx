import React from 'react';
import { X } from 'lucide-react';
import { ManagedColor } from '../types';

interface ColorLegendsProps {
  managedColors: ManagedColor[];
  showRestDayButton?: boolean;
}

const ColorLegends: React.FC<ColorLegendsProps> = ({ managedColors, showRestDayButton = false }) => {
  if (managedColors.length === 0 && !showRestDayButton) return null;

  const handleRestDayDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/rest-day', 'true');
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2 items-center">
      {managedColors.map((color) => (
        <div key={color.id} className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-sm"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-sm font-medium text-gray-600">{color.label}</span>
        </div>
      ))}

      {showRestDayButton && (
        <>
          {managedColors.length > 0 && (
            <div className="w-px h-6 bg-gray-300" />
          )}
          <div
            draggable
            onDragStart={handleRestDayDragStart}
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing px-3 py-1.5 bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg hover:bg-gray-200 hover:border-gray-500 transition-colors select-none"
            title="Glisser-déposer sur une journée pour marquer un jour de repos"
          >
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-gray-600">Repos</span>
          </div>
        </>
      )}
    </div>
  );
};

export default ColorLegends;
