import React, { useState } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minTime?: string;
  maxTime?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ 
  value, 
  onChange, 
  placeholder,
  minTime = '06:30',
  maxTime = '20:00'
}) => {
  const [inputValue, setInputValue] = useState(value);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (input: string): string => {
    const numbers = input.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    }
    
    const hours = numbers.substring(0, 2);
    const minutes = numbers.substring(2, 4);
    
    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);
    
    // Validate minutes to be 00 or 30 only
    const validMinutes = Math.round(minutesNum / 30) * 30;
    const adjustedMinutes = validMinutes === 60 ? '00' : validMinutes.toString().padStart(2, '0');
    
    let finalHours = hoursNum;
    if (validMinutes === 60) {
      finalHours += 1;
    }

    // Clamp hours between min and max time
    const minMinutes = timeToMinutes(minTime);
    const maxMinutes = timeToMinutes(maxTime);
    const currentMinutes = finalHours * 60 + parseInt(adjustedMinutes, 10);

    if (currentMinutes < minMinutes) {
      const minHours = Math.floor(minMinutes / 60);
      const minMins = minMinutes % 60;
      return `${minHours.toString().padStart(2, '0')}:${minMins.toString().padStart(2, '0')}`;
    }

    if (currentMinutes > maxMinutes) {
      const maxHours = Math.floor(maxMinutes / 60);
      const maxMins = maxMinutes % 60;
      return `${maxHours.toString().padStart(2, '0')}:${maxMins.toString().padStart(2, '0')}`;
    }

    return `${finalHours.toString().padStart(2, '0')}:${adjustedMinutes}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^\d:]/g, '');
    setInputValue(newValue);
    
    if (newValue.length >= 4) {
      const formattedTime = formatTime(newValue);
      if (formattedTime.length === 5) {
        onChange(formattedTime);
        setInputValue(formattedTime);
      }
    }
  };

  const handleBlur = () => {
    if (inputValue.length > 0 && inputValue.length < 5) {
      let numbers = inputValue.replace(/\D/g, '');
      while (numbers.length < 4) {
        numbers += '0';
      }
      const formattedTime = formatTime(numbers);
      onChange(formattedTime);
      setInputValue(formattedTime);
    } else if (inputValue.length === 0) {
      setInputValue('');
      onChange('');
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder=":"
      maxLength={5}
      className="w-14 px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-center text-black font-medium"
      style={{ height: '24px', lineHeight: '24px' }}
    />
  );
}

export default TimeInput;