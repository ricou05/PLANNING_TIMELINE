import React, { useState, useRef, useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';

// Réglages d'affichage de la session : rien n'est enregistré, un rechargement
// de la page revient aux valeurs par défaut (100 %).
export interface DisplaySettings {
  fontScale: number;   // taille de la police, en %
  columnScale: number; // largeur des colonnes des vues en tableau, en %
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontScale: 100,
  columnScale: 100,
};

interface DisplaySettingsMenuProps {
  settings: DisplaySettings;
  onChange: (settings: DisplaySettings) => void;
}

const SettingSlider: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ id, label, value, min, max, step, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <span className="text-xs font-semibold text-blue-600 tabular-nums w-12 text-right">
        {value} %
      </span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-full accent-blue-600 cursor-pointer"
    />
  </div>
);

const DisplaySettingsMenu: React.FC<DisplaySettingsMenuProps> = ({ settings, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isDefault =
    settings.fontScale === DEFAULT_DISPLAY_SETTINGS.fontScale &&
    settings.columnScale === DEFAULT_DISPLAY_SETTINGS.columnScale;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Options d'affichage"
        className={`flex items-center justify-center w-9 h-9 rounded-lg border shadow-sm transition-all duration-150 ${
          isOpen || !isDefault
            ? 'bg-blue-50 text-blue-600 border-blue-300'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Options d'affichage</h3>
            <button
              onClick={() => onChange({ ...DEFAULT_DISPLAY_SETTINGS })}
              disabled={isDefault}
              title="Revenir aux valeurs par défaut"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          </div>

          <SettingSlider
            id="display-font-scale"
            label="Taille de la police"
            value={settings.fontScale}
            min={70}
            max={150}
            step={5}
            onChange={(fontScale) => onChange({ ...settings, fontScale })}
          />

          <SettingSlider
            id="display-column-scale"
            label="Largeur des colonnes"
            value={settings.columnScale}
            min={60}
            max={200}
            step={10}
            onChange={(columnScale) => onChange({ ...settings, columnScale })}
          />

          <p className="text-xs text-gray-400 leading-snug border-t border-gray-100 pt-3">
            Ces réglages ne modifient que l'affichage en cours : ils ne sont pas
            enregistrés et reviennent à 100 % au prochain chargement de la page.
          </p>
        </div>
      )}
    </div>
  );
};

export default DisplaySettingsMenu;
