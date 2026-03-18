import { db, Shift } from "../db";
import { parse, isAfter, isBefore, addDays, getHours, getMinutes } from "date-fns";

export function getCurrentShift(date: Date = new Date()): Shift | null {
  const currentHours = date.getHours();
  const currentMinutes = date.getMinutes();
  const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

  for (const shift of db.shifts) {
    const start = shift.startTime;
    const end = shift.endTime;

    if (start < end) {
      if (currentTimeStr >= start && currentTimeStr < end) {
        return shift;
      }
    } else {
      // Shift crosses midnight
      if (currentTimeStr >= start || currentTimeStr < end) {
        return shift;
      }
    }
  }
  return null;
}

export function getShiftStartEndTimes(shift: Shift, date: Date = new Date()): { start: number, end: number } {
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);

  let start = new Date(date);
  start.setHours(startH, startM, 0, 0);

  let end = new Date(date);
  end.setHours(endH, endM, 0, 0);

  if (startH > endH) {
    // Crosses midnight
    if (date.getHours() < endH) {
      // We are in the morning part of the shift, start was yesterday
      start = addDays(start, -1);
    } else {
      // We are in the evening part of the shift, end is tomorrow
      end = addDays(end, 1);
    }
  }

  return { start: start.getTime(), end: end.getTime() };
}
