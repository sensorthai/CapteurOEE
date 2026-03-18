import React, { useState, useEffect } from "react";
import { 
  Factory, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Settings, 
  BarChart2, 
  LogOut,
  Bell,
  Wrench,
  XCircle,
  CheckCircle2,
  MinusCircle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [oeeData, setOeeData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [andonAlerts, setAndonAlerts] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isManualDowntimeModalOpen, setIsManualDowntimeModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/machines")
      .then(res => res.json())
      .then(data => {
        setMachines(data);
        if (data.length > 0) setSelectedMachine(data[0].id);
      });
      
    fetch("/api/shifts/current")
      .then(res => res.json())
      .then(data => setCurrentShift(data));
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;

    const fetchData = async () => {
      const [oeeRes, downtimeRes, andonRes] = await Promise.all([
        fetch(`/api/oee/${selectedMachine}`),
        fetch(`/api/downtime/${selectedMachine}`),
        fetch(`/api/andon/${selectedMachine}`)
      ]);

      if (oeeRes.ok) setOeeData(await oeeRes.json());
      if (downtimeRes.ok) setDowntime(await downtimeRes.json());
      if (andonRes.ok) setAndonAlerts(await andonRes.json());
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "TELEMETRY" && message.data.machineId === selectedMachine) {
          setTelemetry(message.data);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [selectedMachine]);

  const handleManualDowntimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      machineId: selectedMachine,
      startTime: new Date(formData.get("startTime") as string).getTime(),
      endTime: new Date(formData.get("endTime") as string).getTime(),
      downtime_type: formData.get("downtime_type"),
      downtime_reason: formData.get("downtime_reason"),
      operatorId: "OP-001",
      comment: formData.get("comment")
    };

    await fetch("/api/downtime/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    setIsManualDowntimeModalOpen(false);
  };

  const handleResolveAndon = async (reason: string) => {
    // In a real app, this would be a POST request to resolve the alert
    // For this demo, we'll just update the local state to hide it
    setAndonAlerts(prev => prev.filter(a => a.reason !== reason));
  };

  const currentMachine = machines.find(m => m.id === selectedMachine);

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Factory className="text-white size-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-100 leading-none">Industrial OS</h1>
            <p className="text-xs text-neutral-400 mt-1">Floor v2.4</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors">
            <BarChart2 className="size-5" />
            <span className="text-sm font-medium">Global Fleet</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800 text-neutral-100">
            <Activity className="size-5" />
            <span className="text-sm font-medium">Live Machine View</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors">
            <Wrench className="size-5" />
            <span className="text-sm font-medium">Maintenance</span>
          </a>
          <div className="pt-4 mt-4 border-t border-neutral-800">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors">
              <Settings className="size-5" />
              <span className="text-sm font-medium">Settings</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "size-3 rounded-full",
                telemetry?.status === "RUNNING" ? "bg-emerald-500" :
                telemetry?.status === "IDLE" ? "bg-amber-500" :
                telemetry?.status === "BREAKDOWN" ? "bg-red-500" : "bg-neutral-500"
              )} />
              <select 
                className="bg-transparent text-lg font-bold tracking-tight border-none focus:ring-0 cursor-pointer"
                value={selectedMachine || ""}
                onChange={(e) => setSelectedMachine(e.target.value)}
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id} className="bg-neutral-900">{m.name}</option>
                ))}
              </select>
            </div>
            <div className="h-4 w-px bg-neutral-700 mx-2" />
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Clock className="size-4" />
              <span>Shift: <span className="font-mono text-neutral-100">{currentShift?.name || "Loading..."}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Operator:</span>
              <span className="text-sm font-semibold">J. Doe</span>
            </div>
            <button className="p-2 text-neutral-400 hover:bg-neutral-800 rounded-lg relative">
              <Bell className="size-5" />
              {andonAlerts.length > 0 && (
                <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button className="bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-neutral-700 transition-colors">
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-900">
          {andonAlerts.length > 0 && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4">
              <AlertTriangle className="size-6 text-red-500 shrink-0" />
              <div>
                <h3 className="text-red-500 font-bold">Active Andon Alerts</h3>
                <ul className="mt-2 space-y-1">
                  {andonAlerts.map(alert => (
                    <li key={alert.id} className="text-sm text-red-400 flex items-center justify-between bg-red-500/10 p-2 rounded-lg">
                      <span>Level {alert.level}: {alert.reason} (Started at {new Date(alert.startTime).toLocaleTimeString()})</span>
                      <button 
                        onClick={() => handleResolveAndon(alert.reason)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md text-xs font-bold transition-colors"
                      >
                        Resolve
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Metrics & OEE */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* OEE Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">OEE</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-4xl font-black">
                      {oeeData ? (oeeData.oee * 100).toFixed(1) : "--"}<span className="text-xl text-neutral-500">%</span>
                    </span>
                    <div className="w-full bg-neutral-800 h-2 mt-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${oeeData ? oeeData.oee * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Availability</p>
                  <p className="text-2xl font-bold mt-2">{oeeData ? (oeeData.availability * 100).toFixed(1) : "--"}%</p>
                </div>
                <div className="col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Performance</p>
                  <p className="text-2xl font-bold mt-2">{oeeData ? (oeeData.performance * 100).toFixed(1) : "--"}%</p>
                </div>
                <div className="col-span-1 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Quality</p>
                  <p className="text-2xl font-bold mt-2">{oeeData ? (oeeData.quality * 100).toFixed(1) : "--"}%</p>
                </div>
              </div>

              {/* State History */}
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                    <Clock className="size-5" />
                    State History (Current Shift)
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Running</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Idle</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-red-500" />
                      <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Fault</span>
                    </div>
                  </div>
                </div>
                <div className="h-12 w-full flex rounded-lg overflow-hidden mb-2 bg-emerald-500/20 border border-neutral-800 relative">
                  {downtime.map((d, i) => {
                    if (!currentShift) return null;
                    const [startH, startM] = currentShift.startTime.split(':').map(Number);
                    const [endH, endM] = currentShift.endTime.split(':').map(Number);
                    
                    let shiftStart = new Date();
                    shiftStart.setHours(startH, startM, 0, 0);
                    
                    let shiftEnd = new Date();
                    shiftEnd.setHours(endH, endM, 0, 0);
                    
                    if (startH > endH) {
                      if (new Date().getHours() < endH) {
                        shiftStart.setDate(shiftStart.getDate() - 1);
                      } else {
                        shiftEnd.setDate(shiftEnd.getDate() + 1);
                      }
                    }
                    
                    const shiftDuration = shiftEnd.getTime() - shiftStart.getTime();
                    const startOffset = Math.max(0, d.startTime - shiftStart.getTime());
                    const duration = (d.endTime || Date.now()) - d.startTime;
                    
                    return (
                      <div 
                        key={d.id} 
                        className={cn(
                          "h-full absolute top-0",
                          d.type === "PLANNED" ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ 
                          left: `${(startOffset / shiftDuration) * 100}%`,
                          width: `${(duration / shiftDuration) * 100}%`,
                          minWidth: '2px'
                        }}
                        title={`${d.reason} (${Math.round(duration / 1000 / 60)} mins)`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Cycle Time Analysis */}
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-neutral-100">Cycle Time Analysis</h3>
                    <p className="text-xs text-neutral-500">Seconds per part (Last 12 parts)</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.from({length: 12}).map((_, i) => ({ 
                      name: i, 
                      time: currentMachine ? currentMachine.idealCycleTime + (Math.random() * 10 - 2) : 42 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: '#262626'}}
                        contentStyle={{backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px'}}
                        formatter={(value: number) => [value.toFixed(1) + 's', 'Cycle Time']}
                      />
                      <ReferenceLine y={currentMachine?.idealCycleTime || 42} stroke="#a3a3a3" strokeDasharray="3 3" />
                      <Bar dataKey="time" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Rejects */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Actions */}
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setIsManualDowntimeModalOpen(true)}
                  className="bg-neutral-800 text-white p-6 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-neutral-700 transition-all border border-neutral-700"
                >
                  <AlertTriangle className="size-8 text-amber-500" />
                  <span className="font-bold text-sm uppercase tracking-wider">Log Manual Downtime</span>
                </button>
              </div>

              {/* Downtime Analysis */}
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-sm text-neutral-100">Top Downtime Causes (Mins)</h3>
                </div>
                <div className="space-y-4">
                  {downtime.length === 0 ? (
                    <div className="text-sm text-neutral-500 text-center py-4">No downtime recorded</div>
                  ) : (
                    (Object.entries(
                      downtime.reduce((acc, d) => {
                        acc[d.reason] = (acc[d.reason] || 0) + ((d.endTime || Date.now()) - d.startTime) / 1000 / 60;
                        return acc;
                      }, {} as Record<string, number>)
                    ) as [string, number][])
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([reason, mins]) => (
                      <div key={reason} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium mb-1 text-neutral-300">
                          <span>{reason}</span>
                          <span>{Math.round(mins)}m</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (mins / 60) * 100)}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Output Tracking */}
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                <h3 className="font-bold mb-6 flex items-center gap-2">
                  <BarChart2 className="size-5" />
                  Output Tracking
                </h3>
                <div className="flex items-center justify-between mb-8">
                  <div className="text-center flex-1 border-r border-neutral-800">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Good Parts</p>
                    <p className="text-3xl font-black text-emerald-500">{telemetry?.goodCount || 0}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Rejects</p>
                    <p className="text-3xl font-black text-red-500">{telemetry?.rejectCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Manual Downtime Modal */}
      {isManualDowntimeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Log Manual Downtime</h2>
            <form onSubmit={handleManualDowntimeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Start Time</label>
                  <input type="datetime-local" name="startTime" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">End Time</label>
                  <input type="datetime-local" name="endTime" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Type</label>
                <select name="downtime_type" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="PLANNED">Planned</option>
                  <option value="UNPLANNED">Unplanned</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Reason</label>
                <input type="text" name="downtime_reason" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g., Tool Change" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Comment</label>
                <textarea name="comment" rows={3} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Additional details..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsManualDowntimeModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
