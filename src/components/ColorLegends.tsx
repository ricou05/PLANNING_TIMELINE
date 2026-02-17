import React from 'react';
import { ManagedColor } from '../types';

interface ColorLegendsProps {
  managedColors: ManagedColor[];
}

const ColorLegends: React.FC<ColorLegendsProps> = ({ managedColors }) => {
  if (managedColors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2">
      {managedColors.map((color) => (
        <div key={color.id} className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-sm"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-sm font-medium text-gray-600">{color.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ColorLegends;
