import React from 'react';
import { ColorLabel } from '../types';
import { COLOR_OPTIONS } from '../utils/colorUtils';

interface ColorLegendsProps {
  colorLabels: ColorLabel[];
}

const ColorLegends: React.FC<ColorLegendsProps> = ({ colorLabels }) => {
  return (
    <div className="flex flex-wrap gap-4 p-4">
      {colorLabels.map((label) => {
        const colorOption = COLOR_OPTIONS.find(c => c.name.toLowerCase() === label.color.toLowerCase());
        if (!colorOption) return null;
        
        return (
          <div key={label.color} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${colorOption.bgClass} ${colorOption.borderClass}`} />
            <span className="text-sm font-medium text-gray-700">{label.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ColorLegends;