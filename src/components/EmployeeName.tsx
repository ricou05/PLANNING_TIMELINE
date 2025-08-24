import React, { useState, useRef, useEffect } from 'react';
import { EmployeeNameProps } from '../types';

const EmployeeName: React.FC<EmployeeNameProps> = ({ employee, onNameChange }) => {
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
      className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  ) : (
    <span
      onDoubleClick={handleDoubleClick}
      className="block w-full text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
      title="Double-cliquez pour modifier"
    >
      {employee.name}
    </span>
  );
};

export default EmployeeName;