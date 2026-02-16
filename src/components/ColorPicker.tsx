import React, { useState } from 'react';
import { ColorOption, COLOR_OPTIONS } from '../utils/colorUtils';
import { ColorLabel } from '../types';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  colorLabels: ColorLabel[];
  onColorLabelChange: (colorLabel: ColorLabel) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  selectedColor, 
  onColorChange,
  colorLabels = [],
  onColorLabelChange
}) => {
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const handleLabelChange = (color: string, label: string) => {
    onColorLabelChange({ color, label });
    setEditingLabel(null);
  };

  const getLabel = (color: string) => {
    const label = colorLabels.find(cl => cl.color === color.toLowerCase());
    return label?.label || '';
  };

  return (
    <div className="flex items-start gap-4">
      <span className="text-sm font-medium text-gray-700 mt-2">Couleur:</span>
      <div className="flex flex-wrap gap-4">
        {COLOR_OPTIONS.map((color) => (
          <div key={color.name} className="flex flex-col items-center gap-1">
            <button
              onClick={() => onColorChange(color.name.toLowerCase())}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                selectedColor === color.name.toLowerCase()
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  : 'hover:scale-105'
              } ${color.bgClass} ${color.borderClass}`}
              title={color.name}
            />
            {editingLabel === color.name.toLowerCase() ? (
              <input
                type="text"
                maxLength={20}
                placeholder="Légende"
                defaultValue={getLabel(color.name.toLowerCase())}
                onBlur={(e) => handleLabelChange(color.name.toLowerCase(), e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLabelChange(color.name.toLowerCase(), e.currentTarget.value);
                  }
                }}
                className="w-20 text-xs px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setEditingLabel(color.name.toLowerCase())}
                className="w-20 text-xs px-1 py-0.5 text-gray-600 hover:text-gray-900 truncate"
                title="Cliquez pour modifier la légende"
              >
                {getLabel(color.name.toLowerCase()) || 'Ajouter légende'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;