import { Express } from "express";
import { db } from "./db";
import { getCurrentShift, getShiftStartEndTimes } from "./services/shift";
import { calculateOEE } from "./services/oee";

export function setupRoutes(app: Express) {
  app.get("/api/factories", (req, res) => {
    res.json(db.factories);
  });

  app.get("/api/lines", (req, res) => {
    res.json(db.lines);
  });

  app.get("/api/machines", (req, res) => {
    res.json(db.machines);
  });

  app.get("/api/shifts/current", (req, res) => {
    const shift = getCurrentShift();
    res.json(shift);
  });

  app.get("/api/oee/:machineId", (req, res) => {
    const { machineId } = req.params;
    const shift = getCurrentShift();
    if (!shift) return res.status(400).json({ error: "No active shift" });

    const { start, end } = getShiftStartEndTimes(shift);
    const oee = calculateOEE(machineId, start, end);
    res.json(oee);
  });

  app.post("/api/downtime/manual", (req, res) => {
    const { machineId, startTime, endTime, downtime_type, downtime_reason, operatorId, comment } = req.body;
    const shift = getCurrentShift();
    if (!shift) return res.status(400).json({ error: "No active shift" });

    // Conflict resolution logic: merge overlapping downtimes
    const overlappingDowntimes = db.downtime.filter(d => d.machineId === machineId && d.startTime < endTime && (d.endTime === null || d.endTime > startTime));
    
    // For simplicity, we just add the manual downtime and let the calculation handle overlaps
    // In a real system, we'd split/merge records based on priority
    db.downtime.push({
      id: Math.random().toString(36).substring(7),
      machineId,
      startTime,
      endTime,
      type: downtime_type,
      reason: downtime_reason,
      operatorId,
      comment,
      shiftId: shift.id
    });

    res.json({ success: true });
  });

  app.get("/api/andon/:machineId", (req, res) => {
    const { machineId } = req.params;
    const alerts = db.andon.filter(a => a.machineId === machineId && a.endTime === null);
    res.json(alerts);
  });

  app.get("/api/downtime/:machineId", (req, res) => {
    const { machineId } = req.params;
    const shift = getCurrentShift();
    if (!shift) return res.status(400).json({ error: "No active shift" });

    const { start, end } = getShiftStartEndTimes(shift);
    const downtime = db.downtime.filter(d => d.machineId === machineId && d.startTime >= start && (d.endTime === null || d.endTime <= end));
    res.json(downtime);
  });
}
