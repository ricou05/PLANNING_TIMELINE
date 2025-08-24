import React from 'react';
import { Employee } from '../types';
import EmployeeNameEditor from './EmployeeNameEditor';
import { Trash2 } from 'lucide-react';

interface DraggableEmployeeListProps {
  employee: Employee;
  index: number;
  onEmployeeNameChange: (id: number, newName: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  columnWidth: number;
  onDelete?: (id: number) => void;
}

const DraggableEmployeeList: React.FC<DraggableEmployeeListProps> = ({
  employee,
  index,
  onEmployeeNameChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  columnWidth,
  onDelete,
}) => {
  return (
    <div 
      style={{ width: columnWidth }} 
      className="employee-name flex-shrink-0 border-r border-gray-200 p-2 bg-white"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-2">
        <div className="cursor-move text-gray-400 hover:text-gray-600">⋮⋮</div>
        <EmployeeNameEditor
          employee={employee}
          onNameChange={onEmployeeNameChange}
        />
        {onDelete && (
          <button 
            onClick={() => onDelete(employee.id)}
            className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
            title="Supprimer cet employé"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DraggableEmployeeList;