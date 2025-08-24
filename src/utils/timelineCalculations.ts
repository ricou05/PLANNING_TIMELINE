import { timeToMinutes, minutesToTime, TIME_CONSTRAINTS } from './timeUtils';

const HOUR_WIDTH = 80;

export const calculatePosition = (time: string): number => {
  if (!time) return 0;
  const totalMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  return ((totalMinutes - startMinutes) / 15) * (HOUR_WIDTH / 4);
};

export const calculateWidth = (start: string, end: string): number => {
  return calculatePosition(end) - calculatePosition(start);
};

export const snapToGrid = (position: number): number => {
  const gridSize = HOUR_WIDTH / 4;
  return Math.round(position / gridSize) * gridSize;
};

export const getTimeFromPosition = (position: number): string => {
  const startMinutes = timeToMinutes(TIME_CONSTRAINTS.MIN_TIME);
  const snappedPosition = snapToGrid(position);
  const minutes = startMinutes + (snappedPosition / (HOUR_WIDTH / 4)) * 15;
  return minutesToTime(minutes);
};

export const getPositionFromEvent = (e: React.MouseEvent, timelineElement: HTMLElement | null): number => {
  if (!timelineElement) return 0;
  const rect = timelineElement.getBoundingClientRect();
  const scrollLeft = timelineElement.scrollLeft;
  return Math.max(0, e.clientX - rect.left + scrollLeft - 120); // 120 is employee column width
};