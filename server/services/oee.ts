import { db, Machine, Telemetry, DowntimeEvent } from "../db";
import { getShiftStartEndTimes } from "./shift";

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
