import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';

interface EmployeeNameEditorProps {
  employee: Employee;
  onNameChange: (id: number, newName: string) => void;
  className?: string;
}

const EmployeeNameEditor: React.FC<EmployeeNameEditorProps> = ({ 
  employee, 
  onNameChange,
  className = "text-sm font-medium text-gray-900"
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(employee.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (name.trim() !== employee.name) {
      onNameChange(employee.id, name.trim() || `Employé ${employee.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setName(employee.name);
      setIsEditing(false);
    }
  };

  return isEditing ? (
    <input
      ref={inputRef}
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 ${className}`}
    />
  ) : (
    <span
      onDoubleClick={handleDoubleClick}
      className={`block w-full cursor-pointer hover:text-blue-600 transition-colors duration-150 ${className}`}
      title="Double-cliquez pour modifier"
    >
      {employee.name}
    </span>
  );
};

export default EmployeeNameEditor;