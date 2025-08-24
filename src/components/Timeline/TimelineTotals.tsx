import React from 'react';
import { Schedule } from '../../types';
import { calculateDayTotal, calculateGrandTotal } from '../../utils/totalsCalculations';

interface TimelineTotalsProps {
  days: string[];
  schedules: Record<string, Schedule>;
  columnWidths: {
    employee: number;
    dailyTotal: number;
    weeklyTotal: number;
  };
  timelineWidth: number;
}

const TimelineTotals: React.FC<TimelineTotalsProps> = ({
  days,
  schedules,
  columnWidths,
  timelineWidth,
}) => {
  const grandTotal = calculateGrandTotal(schedules);

  return (
    <div className="flex border-t-2 border-gray-300 bg-gray-50">
      <div 
        style={{ width: columnWidths.employee }} 
        className="flex-shrink-0 border-r border-gray-200 p-2 font-bold"
      >
        TOTAUX
      </div>
      <div 
        className="relative flex-grow"
        style={{ width: timelineWidth }}
      />
      <div 
        style={{ width: columnWidths.dailyTotal }} 
        className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center font-bold text-indigo-600"
      >
        {calculateDayTotal(schedules, days[0]).toFixed(2)}h
      </div>
      <div 
        style={{ width: columnWidths.weeklyTotal }} 
        className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center font-bold text-indigo-600"
      >
        {grandTotal.toFixed(2)}h
      </div>
    </div>
  );
};

export default TimelineTotals;