import TimelineTotals from './TimelineTotals';

// ... (existing imports)

const TimelineView: React.FC<TimelineViewProps> = ({
  // ... (existing props)
}) => {
  // ... (existing code)

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4">
        <ColorPicker 
          selectedColor={selectedColor} 
          onColorChange={setSelectedColor}
          colorLabels={colorLabels}
          onColorLabelChange={onColorLabelChange}
        />
      </div>
      
      <div 
        className="overflow-x-auto"
        ref={timelineRef}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        onMouseLeave={handleTimelineMouseUp}
      >
        <div style={{ width: totalWidth }} className="relative">
          <TimelineHeader
            timelineWidth={timelineWidth}
            columnWidths={COLUMN_WIDTH}
            hourWidth={HOUR_WIDTH}
          />

          <div>
            {employees.map((employee) => {
              const schedule = schedules[`${employee.id}-${day}`] || {};
              const dailyHours = calculateDailyHours(schedule);
              const weeklyHours = calculateWeeklyHours(employee.id);
              
              return (
                <TimelineRow
                  key={employee.id}
                  employee={employee}
                  schedule={schedule}
                  dailyHours={dailyHours}
                  weeklyHours={weeklyHours}
                  columnWidths={COLUMN_WIDTH}
                  timelineWidth={timelineWidth}
                  onEmployeeNameChange={onEmployeeNameChange}
                  onTimelineMouseDown={(e) => handleTimelineMouseDown(e, employee.id)}
                  onPeriodMouseDown={(e, period) => handlePeriodMouseDown(e, employee.id, period)}
                  onDelete={(period) => handleDelete(employee.id, period)}
                />
              );
            })}

            <TimelineTotals
              days={[day]}
              schedules={schedules}
              columnWidths={COLUMN_WIDTH}
              timelineWidth={timelineWidth}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;