import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface TabSelectorProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  days: string[];
  dates: string[];
}

const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onTabChange, days, dates }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onTabChange('weekly')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
          ${activeTab === 'weekly'
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
      >
        <Calendar className="h-4 w-4" />
        Vue Hebdomadaire
      </button>
      
      {days.map((day, index) => (
        <button
          key={day}
          onClick={() => onTabChange(day)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${activeTab === day
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
        >
          <Clock className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span>{day}</span>
            <span className="text-xs opacity-75">{dates[index]}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default TabSelector;