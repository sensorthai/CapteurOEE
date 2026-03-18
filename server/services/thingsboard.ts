import { WebSocketServer } from "ws";
import { db, Machine, Telemetry, DowntimeEvent } from "../db";
import { getCurrentShift } from "./shift";
import { checkAndonAlerts } from "./andon";

export function startThingsBoardSimulation(wss: WebSocketServer) {
  setInterval(() => {
    const currentShift = getCurrentShift();
    if (!currentShift) return;

    db.machines.forEach(machine => {
      // Simulate telemetry
      const lastTelemetry = db.telemetry.slice().reverse().find(t => t.machineId === machine.id && t.shiftId === currentShift.id);
      
      let goodCount = lastTelemetry ? lastTelemetry.goodCount : 0;
      let rejectCount = lastTelemetry ? lastTelemetry.rejectCount : 0;
      let status = machine.status;

      // Random state changes
      if (Math.random() < 0.05) {
        const statuses: ("RUNNING" | "IDLE" | "BREAKDOWN")[] = ["RUNNING", "IDLE", "BREAKDOWN"];
        status = statuses[Math.floor(Math.random() * statuses.length)];
        machine.status = status;

        // Handle downtime events
        if (status === "IDLE" || status === "BREAKDOWN") {
          const activeDowntime = db.downtime.find(d => d.machineId === machine.id && d.endTime === null);
          if (!activeDowntime) {
            db.downtime.push({
              id: Math.random().toString(36).substring(7),
              machineId: machine.id,
              startTime: Date.now(),
              endTime: null,
              type: status === "BREAKDOWN" ? "UNPLANNED" : "PLANNED",
              reason: status === "BREAKDOWN" ? "Machine Fault" : "Idle",
              shiftId: currentShift.id
            });
          }
        } else if (status === "RUNNING") {
          const activeDowntime = db.downtime.find(d => d.machineId === machine.id && d.endTime === null);
          if (activeDowntime) {
            activeDowntime.endTime = Date.now();
          }
        }
      }

      // Simulate production
      if (status === "RUNNING") {
        goodCount += Math.floor(Math.random() * 5);
        if (Math.random() < 0.1) {
          rejectCount += 1;
        }
      }

      const telemetry: Telemetry = {
        machineId: machine.id,
        timestamp: Date.now(),
        status,
        goodCount,
        rejectCount,
        shiftId: currentShift.id
      };

      db.telemetry.push(telemetry);

      // Check Andon alerts
      checkAndonAlerts(machine.id);

      // Broadcast to clients
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({ type: "TELEMETRY", data: telemetry }));
        }
      });
    });
  }, 5000); // Every 5 seconds
}
