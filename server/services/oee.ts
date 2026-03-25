import { db, Machine, Telemetry, DowntimeEvent } from "../db";
import { getShiftStartEndTimes } from "./shift";
import { eachDayOfInterval } from "date-fns";

export function calculateOEE(machineId: string, startTime: number, endTime: number) {
  const machine = db.machines.find(m => m.id === machineId);
  if (!machine) return null;

  const telemetry = db.telemetry.filter(t => t.machineId === machineId && t.timestamp >= startTime && t.timestamp <= endTime);
  const downtime = db.downtime.filter(d => d.machineId === machineId && d.startTime >= startTime && (d.endTime === null || d.endTime <= endTime));

  let totalGoodCount = 0;
  let totalRejectCount = 0;
  
  // Calculate counts
  if (telemetry.length > 0) {
    // Assuming telemetry sends cumulative counts for the shift
    const lastTelemetry = telemetry[telemetry.length - 1];
    totalGoodCount = lastTelemetry.goodCount;
    totalRejectCount = lastTelemetry.rejectCount;
  }

  const totalCount = totalGoodCount + totalRejectCount;

  // Calculate times
  const plannedProductionTime = (endTime - startTime) / 1000; // seconds

  let plannedDowntime = 0;
  let unplannedDowntime = 0;

  downtime.forEach(d => {
    const end = d.endTime || Date.now();
    const duration = (end - d.startTime) / 1000;
    if (d.type === "PLANNED") {
      plannedDowntime += duration;
    } else {
      unplannedDowntime += duration;
    }
  });

  const runTime = plannedProductionTime - plannedDowntime - unplannedDowntime;

  // Availability
  const availability = runTime > 0 ? runTime / (plannedProductionTime - plannedDowntime) : 0;

  // Performance
  const performance = runTime > 0 ? (machine.idealCycleTime * totalCount) / runTime : 0;

  // Quality
  const quality = totalCount > 0 ? totalGoodCount / totalCount : 0;

  // OEE
  const oee = availability * performance * quality;

  return {
    availability: Math.min(1, Math.max(0, availability)),
    performance: Math.min(1, Math.max(0, performance)),
    quality: Math.min(1, Math.max(0, quality)),
    oee: Math.min(1, Math.max(0, oee)),
    runTime,
    plannedDowntime,
    unplannedDowntime,
    totalGoodCount,
    totalRejectCount,
    totalCount
  };
}

export function calculateFactoryOEE(factoryId: string, startTime: number, endTime: number) {
  const factory = db.factories.find(f => f.id === factoryId);
  if (!factory) return null;

  const machinesInFactory = db.machines.filter(m => m.factoryId === factoryId);
  if (machinesInFactory.length === 0) return null;

  let totalRunTime = 0;
  let totalPlannedDowntime = 0;
  let totalUnplannedDowntime = 0;
  let totalGoodCount = 0;
  let totalRejectCount = 0;
  let totalCount = 0;
  let totalIdealCycleTimeCount = 0; // Sum of (idealCycleTime * totalCount) for all machines

  let validMachinesCount = 0;

  for (const machine of machinesInFactory) {
    const oee = calculateOEE(machine.id, startTime, endTime);
    if (oee) {
      totalRunTime += oee.runTime;
      totalPlannedDowntime += oee.plannedDowntime;
      totalUnplannedDowntime += oee.unplannedDowntime;
      totalGoodCount += oee.totalGoodCount;
      totalRejectCount += oee.totalRejectCount;
      totalCount += oee.totalCount;
      totalIdealCycleTimeCount += (machine.idealCycleTime * oee.totalCount);
      validMachinesCount++;
    }
  }

  if (validMachinesCount === 0) return null;

  const plannedProductionTime = (endTime - startTime) / 1000 * validMachinesCount; // seconds for all machines

  // Availability
  const availability = totalRunTime > 0 ? totalRunTime / (plannedProductionTime - totalPlannedDowntime) : 0;

  // Performance
  const performance = totalRunTime > 0 ? totalIdealCycleTimeCount / totalRunTime : 0;

  // Quality
  const quality = totalCount > 0 ? totalGoodCount / totalCount : 0;

  // OEE
  const oee = availability * performance * quality;

  return {
    availability: Math.min(1, Math.max(0, availability)),
    performance: Math.min(1, Math.max(0, performance)),
    quality: Math.min(1, Math.max(0, quality)),
    oee: Math.min(1, Math.max(0, oee)),
    runTime: totalRunTime,
    plannedDowntime: totalPlannedDowntime,
    unplannedDowntime: totalUnplannedDowntime,
    totalGoodCount,
    totalRejectCount,
    totalCount
  };
}

export function calculateHistoricalOEE(machineId: string, startDate: Date, endDate: Date, shiftId?: string) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const shifts = shiftId ? db.shifts.filter(s => s.id === shiftId) : db.shifts;
  
  const history = [];
  for (const day of days) {
    for (const shift of shifts) {
      const { start, end } = getShiftStartEndTimes(shift, day);
      const oee = calculateOEE(machineId, start, end);
      if (oee) {
        history.push({
          date: day.toISOString().split('T')[0],
          shiftId: shift.id,
          shiftName: shift.name,
          ...oee
        });
      }
    }
  }
  return history;
}

export function calculateFactoryHistoricalOEE(factoryId: string, startDate: Date, endDate: Date, shiftId?: string) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const shifts = shiftId ? db.shifts.filter(s => s.id === shiftId) : db.shifts;
  
  const history = [];
  for (const day of days) {
    for (const shift of shifts) {
      const { start, end } = getShiftStartEndTimes(shift, day);
      const oee = calculateFactoryOEE(factoryId, start, end);
      if (oee) {
        history.push({
          date: day.toISOString().split('T')[0],
          shiftId: shift.id,
          shiftName: shift.name,
          ...oee
        });
      }
    }
  }
  return history;
}
