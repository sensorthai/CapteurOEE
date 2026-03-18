import { db, Machine, AndonEvent } from "../db";
import { getCurrentShift } from "./shift";

export function checkAndonAlerts(machineId: string) {
  const machine = db.machines.find(m => m.id === machineId);
  if (!machine) return;

  const currentShift = getCurrentShift();
  if (!currentShift) return;

  const telemetry = db.telemetry.filter(t => t.machineId === machineId && t.shiftId === currentShift.id);
  const lastTelemetry = telemetry[telemetry.length - 1];

  if (!lastTelemetry) return;

  // Rule 1: Machine status = BREAKDOWN
  if (lastTelemetry.status === "BREAKDOWN") {
    triggerAndon(machineId, 2, "Machine Breakdown", currentShift.id);
  }

  // Rule 2: Reject rate > threshold (e.g., 5%)
  const totalCount = lastTelemetry.goodCount + lastTelemetry.rejectCount;
  if (totalCount > 100 && lastTelemetry.rejectCount / totalCount > 0.05) {
    triggerAndon(machineId, 1, "High Reject Rate", currentShift.id);
  }

  // Rule 3: No production for X minutes (e.g., 15 mins)
  const now = Date.now();
  const lastProductionTime = telemetry.slice().reverse().find(t => t.goodCount > 0)?.timestamp || 0;
  if (now - lastProductionTime > 15 * 60 * 1000) {
    triggerAndon(machineId, 1, "No Production for 15 mins", currentShift.id);
  }
}

function triggerAndon(machineId: string, level: 1 | 2 | 3, reason: string, shiftId: string) {
  // Check if an active alert already exists for this reason
  const activeAlert = db.andon.find(a => a.machineId === machineId && a.reason === reason && a.endTime === null);
  if (!activeAlert) {
    db.andon.push({
      id: Math.random().toString(36).substring(7),
      machineId,
      startTime: Date.now(),
      endTime: null,
      level,
      reason,
      shiftId
    });
  }
}

export function resolveAndon(machineId: string, reason: string) {
  const activeAlert = db.andon.find(a => a.machineId === machineId && a.reason === reason && a.endTime === null);
  if (activeAlert) {
    activeAlert.endTime = Date.now();
  }
}
