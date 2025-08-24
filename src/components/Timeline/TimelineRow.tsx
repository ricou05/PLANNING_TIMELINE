import React from 'react';
import { Employee, Schedule } from '../../types';
import DraggableEmployeeList from '../DraggableEmployeeList';
import TimelinePeriod from './TimelinePeriod';
import { calculatePosition, calculateWidth } from '../../utils/timelineCalculations';
import { TIME_SLOTS } from '../../utils/timeUtils';

interface TimelineRowProps {
  employee: Employee;
  schedule: Schedule;
  dailyHours: number;
  weeklyHours: number;
  columnWidths: {
    employee: number;
    dailyTotal: number;
    weeklyTotal: number;
  };
  timelineWidth: number;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onTimelineMouseDown: (e: React.MouseEvent) => void;
  onPeriodMouseDown: (e: React.MouseEvent, period: 'morning' | 'afternoon') => void;
  onDelete: (period: 'morning' | 'afternoon') => void;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  employee,
  schedule,
  dailyHours,
  weeklyHours,
  columnWidths,
  timelineWidth,
  onEmployeeNameChange,
  onTimelineMouseDown,
  onPeriodMouseDown,
  onDelete
}) => {
  return (
    <div className="flex border-b border-gray-200">
      <DraggableEmployeeList
        employee={employee}
        index={0}
        onEmployeeNameChange={onEmployeeNameChange}
        onDragStart={() => {}}
        onDragOver={() => {}}
        onDragEnd={() => {}}
        columnWidth={columnWidths.employee}
      />
      <div 
        className="relative flex-grow h-9"
        style={{ width: timelineWidth }}
        onMouseDown={onTimelineMouseDown}
      >
        {schedule.morningStart && schedule.morningEnd && (
          <TimelinePeriod
            period="morning"
            schedule={schedule}
            position={calculatePosition(schedule.morningStart)}
            width={calculateWidth(schedule.morningStart, schedule.morningEnd)}
            onMouseDown={(e) => onPeriodMouseDown(e, 'morning')}
            onDelete={() => onDelete('morning')}
          />
        )}

        {schedule.afternoonStart && schedule.afternoonEnd && (
          <TimelinePeriod
            period="afternoon"
            schedule={schedule}
            position={calculatePosition(schedule.afternoonStart)}
            width={calculateWidth(schedule.afternoonStart, schedule.afternoonEnd)}
            onMouseDown={(e) => onPeriodMouseDown(e, 'afternoon')}
            onDelete={() => onDelete('afternoon')}
          />
        )}

        {TIME_SLOTS.map((time) => (
          <div
            key={time}
            className="absolute h-full border-l border-gray-100"
            style={{ left: calculatePosition(time) }}
          />
        ))}
      </div>
      <div style={{ width: columnWidths.dailyTotal }} className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center">
        <span className="text-sm font-medium text-indigo-600">
          {dailyHours.toFixed(2)}h
        </span>
      </div>
      <div style={{ width: columnWidths.weeklyTotal }} className="flex-shrink-0 border-l border-gray-200 flex items-center justify-center">
        <span className="text-sm font-medium text-indigo-600">
          {weeklyHours.toFixed(2)}h
        </span>
      </div>
    </div>
  );
};

export default TimelineRow;