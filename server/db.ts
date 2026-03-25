export type MachineStatus = "RUNNING" | "IDLE" | "BREAKDOWN";
export type DowntimeType = "PLANNED" | "UNPLANNED";

export interface Factory {
  id: string;
  name: string;
  oeeThreshold?: number;
}

export interface Machine {
  id: string;
  name: string;
  lineId: string;
  factoryId: string;
  status: MachineStatus;
  idealCycleTime: number; // seconds
  oeeThreshold: number; // target OEE percentage (e.g., 75)
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
  factories: [] as Factory[],
  lines: [],
  machines: [] as Machine[],
  shifts: [
    { id: "S1", name: "Morning Shift", startTime: "06:00", endTime: "14:00" },
    { id: "S2", name: "Afternoon Shift", startTime: "14:00", endTime: "22:00" },
    { id: "S3", name: "Night Shift", startTime: "22:00", endTime: "06:00" },
  ] as Shift[],
  telemetry: [] as Telemetry[],
  downtime: [] as DowntimeEvent[],
  andon: [] as AndonEvent[],
};
