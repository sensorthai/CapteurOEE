import { Express } from "express";
import { db } from "./db";
import { getCurrentShift, getShiftStartEndTimes } from "./services/shift";
import { calculateOEE, calculateFactoryOEE, calculateHistoricalOEE, calculateFactoryHistoricalOEE } from "./services/oee";
import { ThingsBoardService, TBError } from "./services/thingsboard";
import { eachDayOfInterval, parseISO } from "date-fns";

export function setupRoutes(app: Express) {
  // Helper to get TB Service from request
  const getTBService = (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("Unauthorized");
    return new ThingsBoardService(authHeader);
  };

  const getTBEntityType = (type: string) => {
    const t = type.toLowerCase();
    if (t === "machine") return "DEVICE";
    if (t === "factory") return "ASSET";
    return type.toUpperCase();
  };

  const handleRouteError = (res: any, error: any, context: string) => {
    console.error(`${context}:`, error);
    if (error instanceof TBError && error.status === 401) {
      // Don't log 401 as an error, it's usually just an expired session
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    if (error instanceof TBError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.status(500).json({ error: "Internal server error" });
  };

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const response = await fetch("https://iot1.wsa.cloud/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Authentication failed" });
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      res.json(data);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/thingsboard/factories", async (req, res) => {
    try {
      const tb = getTBService(req);
      const data = await tb.getAssets(100, 0);
      const factories = data.data
        .filter((asset: any) => asset.assetProfileName === "Factory" || asset.type === "Factory")
        .map((asset: any) => ({
          id: asset.id?.id || "unknown",
          name: asset.name || "Unnamed Factory",
          oeeThreshold: 85,
          type: "thingsboard",
          profile: asset.assetProfileName || asset.type
        }));
      res.json(factories);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB factories error");
    }
  });

  app.get("/api/thingsboard/machines", async (req, res) => {
    try {
      const tb = getTBService(req);
      const data = await tb.getDevices(100, 0);
      const machines = data.data.map((device: any) => ({
        id: device.id?.id || "unknown",
        name: device.name || "Unnamed Machine",
        type: "thingsboard",
        profile: device.deviceProfileName,
        factoryId: null,
        productionLineId: null
      }));

      // Fetch relations for each machine to find its parent production_line and factory
      const machinesWithRelations = await Promise.all(machines.map(async (machine: any) => {
        const relations = await tb.getRelations("DEVICE", machine.id, "TO");
        
        // Find parent production_line (ASSET)
        const parentLine = Array.isArray(relations) ? relations.find((r: any) => r.from.entityType === "ASSET" && r.type === "Contains") : null;
        if (parentLine) {
          machine.productionLineId = parentLine.from.id;
          
          // Find parent factory for the production_line
          const lineRelations = await tb.getRelations("ASSET", parentLine.from.id, "TO");
          const parentFactory = Array.isArray(lineRelations) ? lineRelations.find((r: any) => r.from.entityType === "ASSET" && r.type === "Contains") : null;
          if (parentFactory) {
            machine.factoryId = parentFactory.from.id;
          }
        }
        return machine;
      }));

      res.json(machinesWithRelations);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB machines error");
    }
  });

  app.get("/api/thingsboard/production-lines", async (req, res) => {
    try {
      const tb = getTBService(req);
      const data = await tb.getAssets(100, 0);
      const lines = data.data
        .filter((asset: any) => asset.assetProfileName === "Production_Line" || asset.type === "Production_Line")
        .map((asset: any) => ({
          id: asset.id?.id || "unknown",
          name: asset.name || "Unnamed Production_Line",
          type: "thingsboard",
          profile: asset.assetProfileName || asset.type,
          factoryId: null
        }));

      // Fetch relations for each line to find its parent factory
      // In TB, relation is often Factory -> Production_Line
      // So we look for relations where TO is the line
      const linesWithFactory = await Promise.all(lines.map(async (line: any) => {
        const relations = await tb.getRelations("ASSET", line.id, "TO");
        const parentFactory = Array.isArray(relations) ? relations.find((r: any) => r.from.entityType === "ASSET" && r.type === "Contains") : null;
        if (parentFactory) {
          line.factoryId = parentFactory.from.id;
        }
        return line;
      }));

      res.json(linesWithFactory);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB production_lines error");
    }
  });

  app.post("/api/thingsboard/relations", async (req, res) => {
    try {
      const tb = getTBService(req);
      const { fromId, fromType, toId, toType, relationType } = req.body;
      const relation = {
        from: { id: fromId, entityType: fromType },
        to: { id: toId, entityType: toType },
        type: relationType
      };
      const result = await tb.saveRelation(relation);
      res.json(result);
    } catch (error: any) {
      handleRouteError(res, error, "Save TB relation error");
    }
  });

  app.delete("/api/thingsboard/relations", async (req, res) => {
    try {
      const tb = getTBService(req);
      const { fromId, fromType, toId, toType, relationType } = req.body;
      const result = await tb.deleteRelation(fromId, fromType, toId, toType, relationType);
      res.json(result);
    } catch (error: any) {
      handleRouteError(res, error, "Delete TB relation error");
    }
  });

  app.get("/api/thingsboard/telemetry/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const tb = getTBService(req);
      const keys = ["status", "good_count", "reject_count", "total_count", "cycle_time", "planned_time", "downtime"];
      const data = await tb.getLatestTelemetry(getTBEntityType(entityType), entityId, keys);
      
      // Transform TB telemetry to our internal format
      const result: any = { machineId: entityId };
      Object.keys(data).forEach(key => {
        if (data[key] && data[key].length > 0) {
          result[key] = data[key][0].value;
        }
      });
      
      res.json(result);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB telemetry error");
    }
  });

  app.get("/api/thingsboard/oee/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const tb = getTBService(req);
      const shift = getCurrentShift();
      if (!shift) return res.status(400).json({ error: "No active shift" });
      const { start, end } = getShiftStartEndTimes(shift);

      const keys = ["status", "good_count", "reject_count", "total_count", "cycle_time", "planned_time", "downtime"];
      const [telemetry, attributes] = await Promise.all([
        tb.getHistoricalTelemetry(getTBEntityType(entityType), entityId, keys, start, end),
        tb.getAttributes(getTBEntityType(entityType), entityId, "SERVER_SCOPE")
      ]);

      // Simple OEE calculation using TB data
      // This is a simplified version of the logic in services/oee.ts
      let goodCount = 0;
      let totalCount = 0;
      let unplannedDowntime = 0;
      const idealCycleTime = attributes.idealCycleTime || 30; // Default 30s

      const goodCountData = telemetry.good_count || [];
      const totalCountData = telemetry.total_count || [];
      const downtimeData = telemetry.downtime || [];

      if (goodCountData.length > 0) goodCount = Number(goodCountData[0].value);
      if (totalCountData.length > 0) totalCount = Number(totalCountData[0].value);
      
      // Sum up downtime from telemetry if it's cumulative, or calculate from status changes
      // For now, assume cumulative downtime telemetry
      if (downtimeData.length > 0) unplannedDowntime = Number(downtimeData[0].value);

      const plannedProductionTime = (end - start) / 1000;
      const runTime = Math.max(0, plannedProductionTime - unplannedDowntime);
      
      const availability = plannedProductionTime > 0 ? runTime / plannedProductionTime : 0;
      const performance = runTime > 0 ? (idealCycleTime * totalCount) / runTime : 0;
      const quality = totalCount > 0 ? goodCount / totalCount : 0;
      const oee = availability * performance * quality;

      res.json({
        availability: Math.min(1, Math.max(0, availability)),
        performance: Math.min(1, Math.max(0, performance)),
        quality: Math.min(1, Math.max(0, quality)),
        oee: Math.min(1, Math.max(0, oee)),
        totalGoodCount: goodCount,
        totalCount: totalCount,
        unplannedDowntime
      });
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB OEE error");
    }
  });

  app.get("/api/thingsboard/oee-history/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { startDate, endDate, shiftId } = req.query;
      const tb = getTBService(req);
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);
      const days = eachDayOfInterval({ start, end });
      
      const selectedShift = shiftId ? db.shifts.find(s => s.id === shiftId) : null;
      const shiftsToCalculate = selectedShift ? [selectedShift] : db.shifts;

      const history = [];

      // Fetch attributes once
      const attributes = await tb.getAttributes(getTBEntityType(entityType), entityId, "SERVER_SCOPE");
      const idealCycleTime = attributes.idealCycleTime || 30;

      for (const day of days) {
        for (const shift of shiftsToCalculate) {
          const { start: shiftStart, end: shiftEnd } = getShiftStartEndTimes(shift, day);
          
          const keys = ["status", "good_count", "reject_count", "total_count", "cycle_time", "planned_time", "downtime"];
          const telemetry = await tb.getHistoricalTelemetry(getTBEntityType(entityType), entityId, keys, shiftStart, shiftEnd, 1);
          
          let goodCount = 0;
          let totalCount = 0;
          let unplannedDowntime = 0;

          const goodCountData = telemetry.good_count || [];
          const totalCountData = telemetry.total_count || [];
          const downtimeData = telemetry.downtime || [];

          if (goodCountData.length > 0) goodCount = Number(goodCountData[0].value);
          if (totalCountData.length > 0) totalCount = Number(totalCountData[0].value);
          if (downtimeData.length > 0) unplannedDowntime = Number(downtimeData[0].value);

          const plannedProductionTime = (shiftEnd - shiftStart) / 1000;
          const runTime = Math.max(0, plannedProductionTime - unplannedDowntime);
          
          const availability = plannedProductionTime > 0 ? runTime / plannedProductionTime : 0;
          const performance = runTime > 0 ? (idealCycleTime * totalCount) / runTime : 0;
          const quality = totalCount > 0 ? goodCount / totalCount : 0;
          const oee = availability * performance * quality;

          history.push({
            date: day.toISOString().split('T')[0],
            shiftId: shift.id,
            shiftName: shift.name,
            availability: Math.min(1, Math.max(0, availability)),
            performance: Math.min(1, Math.max(0, performance)),
            quality: Math.min(1, Math.max(0, quality)),
            oee: Math.min(1, Math.max(0, oee)),
            totalGoodCount: goodCount,
            totalCount: totalCount,
            unplannedDowntime
          });
        }
      }

      res.json(history);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB OEE history error");
    }
  });

  app.get("/api/thingsboard/user", async (req, res) => {
    try {
      const tb = getTBService(req);
      const data = await tb.getUserInfo();
      res.json(data);
    } catch (error: any) {
      handleRouteError(res, error, "Fetch TB user error");
    }
  });

  app.post("/api/thingsboard/assets", async (req, res) => {
    try {
      const tb = getTBService(req);
      const asset = req.body;
      const data = await tb.saveAsset(asset);
      res.json(data);
    } catch (error: any) {
      handleRouteError(res, error, "Save TB asset error");
    }
  });

  app.post("/api/thingsboard/relations", async (req, res) => {
    try {
      const tb = getTBService(req);
      const relation = req.body;
      const data = await tb.saveRelation(relation);
      res.json(data);
    } catch (error: any) {
      handleRouteError(res, error, "Save TB relation error");
    }
  });

  app.get("/api/lines", (req, res) => {
    res.json(db.lines);
  });

  app.get("/api/machines", (req, res) => {
    res.json(db.machines);
  });

  app.post("/api/machines/:machineId/threshold", (req, res) => {
    const { machineId } = req.params;
    const { threshold } = req.body;
    const machine = db.machines.find(m => m.id === machineId);
    if (!machine) return res.status(404).json({ error: "Machine not found" });
    
    machine.oeeThreshold = Number(threshold);
    res.json({ success: true, machine });
  });

  app.post("/api/factories/:factoryId/threshold", (req, res) => {
    const { factoryId } = req.params;
    const { threshold } = req.body;
    const factory = db.factories.find(f => f.id === factoryId);
    if (!factory) return res.status(404).json({ error: "Factory not found" });
    
    factory.oeeThreshold = Number(threshold);
    res.json({ success: true, factory });
  });

  app.get("/api/shifts/current", (req, res) => {
    const shift = getCurrentShift();
    res.json(shift);
  });

  app.get("/api/shifts", (req, res) => {
    res.json(db.shifts);
  });

  app.get("/api/oee/:machineId", (req, res) => {
    const { machineId } = req.params;
    const shift = getCurrentShift();
    if (!shift) return res.status(400).json({ error: "No active shift" });

    const { start, end } = getShiftStartEndTimes(shift);
    const oee = calculateOEE(machineId, start, end);
    res.json(oee);
  });

  app.get("/api/factories/:factoryId/oee", (req, res) => {
    const { factoryId } = req.params;
    const shift = getCurrentShift();
    if (!shift) return res.status(400).json({ error: "No active shift" });

    const { start, end } = getShiftStartEndTimes(shift);
    const oee = calculateFactoryOEE(factoryId, start, end);
    res.json(oee);
  });

  app.get("/api/oee-history/:machineId", (req, res) => {
    const { machineId } = req.params;
    const { startDate, endDate, shiftId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });
    
    const history = calculateHistoricalOEE(machineId, parseISO(startDate as string), parseISO(endDate as string), shiftId as string);
    res.json(history);
  });

  app.get("/api/factories/:factoryId/oee-history", (req, res) => {
    const { factoryId } = req.params;
    const { startDate, endDate, shiftId } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });
    
    const history = calculateFactoryHistoricalOEE(factoryId, parseISO(startDate as string), parseISO(endDate as string), shiftId as string);
    res.json(history);
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

  // Catch-all for API routes to prevent falling through to Vite SPA fallback
  app.all("/api/*", (req, res) => {
    console.warn(`API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API route not found",
      method: req.method,
      url: req.url
    });
  });
}
