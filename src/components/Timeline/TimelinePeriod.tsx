import React from 'react';
import { X } from 'lucide-react';
import { Schedule } from '../../types';
import { COLOR_OPTIONS } from '../../utils/colorUtils';

interface TimelinePeriodProps {
  period: 'morning' | 'afternoon';
  schedule: Schedule;
  position: number;
  width: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

const TimelinePeriod: React.FC<TimelinePeriodProps> = ({
  period,
  schedule,
  position,
  width,
  onMouseDown,
  onDelete
}) => {
  const color = schedule[`${period}Color`];
  const start = schedule[`${period}Start`];
  const end = schedule[`${period}End`];
  const colorOption = color ? COLOR_OPTIONS.find(c => c.name.toLowerCase() === color) : null;

  return (
    <div
      className={`absolute h-7 top-1 border rounded cursor-move group
        ${colorOption?.bgClass || (period === 'morning' ? 'bg-blue-100' : 'bg-indigo-100')}
        ${colorOption?.borderClass || (period === 'morning' ? 'border-blue-200' : 'border-indigo-200')}`}
      style={{
        left: position,
        width: width,
      }}
      onMouseDown={onMouseDown}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize" />
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize" />
      <span className={`text-xs px-2 leading-[28px] whitespace-nowrap
        ${colorOption?.textClass || (period === 'morning' ? 'text-blue-800' : 'text-indigo-800')}`}>
        {start} - {end}
      </span>
      <button
        onClick={onDelete}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-100 opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3 text-red-600" />
      </button>
    </div>
  );
};

export default TimelinePeriod;