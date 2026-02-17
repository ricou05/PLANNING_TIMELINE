import React from 'react';
import { Settings } from 'lucide-react';
import { ManagedColor } from '../types';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  managedColors: ManagedColor[];
  onManageClick: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  managedColors,
  onManageClick,
}) => {
  return (
    <div className="flex items-start gap-4">
      <span className="text-sm font-medium text-gray-700 mt-2">Couleur:</span>
      <div className="flex flex-wrap gap-4">
        {managedColors.map((color) => (
          <div key={color.id} className="flex flex-col items-center gap-1">
            <button
              onClick={() => onColorChange(color.id)}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                selectedColor === color.id
                  ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: color.hex,
                borderColor: color.hex,
              }}
              title={color.label}
            />
            <span
              className="w-20 text-xs px-1 py-0.5 text-gray-600 truncate text-center"
              title={color.label}
            >
              {color.label}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onManageClick}
        className="mt-1 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Gerer les couleurs"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ColorPicker;
