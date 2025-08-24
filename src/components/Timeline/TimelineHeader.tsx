import React from 'react';
import { TIME_SLOTS } from '../../utils/timeUtils';

interface TimelineHeaderProps {
  timelineWidth: number;
  columnWidths: {
    employee: number;
    dailyTotal: number;
    weeklyTotal: number;
  };
  hourWidth: number;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ timelineWidth, columnWidths, hourWidth }) => {
  return (
    <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
      <div className="flex">
        <div style={{ width: columnWidths.employee }} className="flex-shrink-0 border-r border-gray-200 bg-gray-50" />
        <div className="flex" style={{ width: timelineWidth }}>
          {TIME_SLOTS.map((time, index) => {
            const isHourStart = time.endsWith('00') || time.endsWith('30');
            return (
              <div
                key={time}
                className="border-r border-gray-200 flex items-center justify-start pl-1"
                style={{ width: hourWidth / 4 }}
              >
                {isHourStart && (
                  <span className="text-xs font-medium text-gray-500">{time}</span>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ width: columnWidths.dailyTotal }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-500">Total jour</span>
        </div>
        <div style={{ width: columnWidths.weeklyTotal }} className="flex-shrink-0 border-l border-gray-200 bg-gray-50 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-500">Total sem.</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineHeader;