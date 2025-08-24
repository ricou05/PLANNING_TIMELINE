import { Schedule } from '../types';
import { timeToMinutes, TIME_CONSTRAINTS } from './timeUtils';

export const checkPeriodOverlap = (
  startTime: string,
  endTime: string,
  otherPeriodStart: string | undefined,
  otherPeriodEnd: string | undefined
): boolean => {
  if (!otherPeriodStart || !otherPeriodEnd) return false;

  const newPeriodStartMinutes = timeToMinutes(startTime);
  const newPeriodEndMinutes = timeToMinutes(endTime);
  const otherPeriodStartMinutes = timeToMinutes(otherPeriodStart);
  const otherPeriodEndMinutes = timeToMinutes(otherPeriodEnd);

  return (
    (newPeriodStartMinutes >= otherPeriodStartMinutes && newPeriodStartMinutes < otherPeriodEndMinutes) ||
    (newPeriodEndMinutes > otherPeriodStartMinutes && newPeriodEndMinutes <= otherPeriodEndMinutes) ||
    (newPeriodStartMinutes <= otherPeriodStartMinutes && newPeriodEndMinutes >= otherPeriodEndMinutes)
  );
};

export const getPeriodType = (time: string): 'morning' | 'afternoon' => {
  return timeToMinutes(time) < timeToMinutes(TIME_CONSTRAINTS.NOON_TIME) ? 'morning' : 'afternoon';
};

export const getOtherPeriod = (schedule: Schedule, currentPeriod: 'morning' | 'afternoon') => {
  if (currentPeriod === 'morning') {
    return {
      start: schedule.afternoonStart,
      end: schedule.afternoonEnd
    };
  }
  return {
    start: schedule.morningStart,
    end: schedule.morningEnd
  };
};