export type MachineStatus = "RUNNING" | "IDLE" | "BREAKDOWN";
export type DowntimeType = "PLANNED" | "UNPLANNED";

export interface Machine {
  id: string;
  name: string;
  lineId: string;
  factoryId: string;
  status: MachineStatus;
  idealCycleTime: number; // seconds
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Telemetry {
  machineId: string;
  timestamp: number;
  status: MachineStatus;
  goodCount: number;
  rejectCount: number;
  shiftId: string;
}

export interface DowntimeEvent {
  id: string;
  machineId: string;
  startTime: number;
  endTime: number | null;
  type: DowntimeType;
  reason: string;
  operatorId?: string;
  comment?: string;
  shiftId: string;
}

export interface AndonEvent {
  id: string;
  machineId: string;
  startTime: number;
  endTime: number | null;
  level: 1 | 2 | 3;
  reason: string;
  shiftId: string;
}

export const db = {
  factories: [
    { id: "F1", name: "Factory A - Sector 4" },
    { id: "F2", name: "Factory B - Sector 1" },
  ],
  lines: [
    { id: "L1", name: "Line 04", factoryId: "F1" },
    { id: "L2", name: "Line 05", factoryId: "F1" },
  ],
  machines: [
    { id: "M1", name: "CNC Milling Center 04", lineId: "L1", factoryId: "F1", status: "RUNNING", idealCycleTime: 42 },
    { id: "M2", name: "Lathe 02", lineId: "L1", factoryId: "F1", status: "IDLE", idealCycleTime: 30 },
    { id: "M3", name: "Assembly Robot 1", lineId: "L2", factoryId: "F1", status: "RUNNING", idealCycleTime: 15 },
  ] as Machine[],
  shifts: [
    { id: "S1", name: "Morning Shift", startTime: "06:00", endTime: "14:00" },
    { id: "S2", name: "Afternoon Shift", startTime: "14:00", endTime: "22:00" },
    { id: "S3", name: "Night Shift", startTime: "22:00", endTime: "06:00" },
  ] as Shift[],
  telemetry: [] as Telemetry[],
  downtime: [] as DowntimeEvent[],
  andon: [] as AndonEvent[],
};
