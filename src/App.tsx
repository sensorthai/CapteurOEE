import React, { useState, useEffect, useCallback } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  MinusCircle,
  AlertCircle,
  PauseCircle,
  Power,
  TrendingUp,
  TrendingDown,
  Filter,
  History,
  LayoutDashboard,
  Monitor,
  TimerOff,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  PieChart as PieChartIcon,
  Hammer,
  ClipboardList,
  HeartPulse,
  Brain,
  MoreHorizontal,
  Calendar,
  Download,
  User,
  Thermometer,
  Cpu,
  Plus,
  Layers,
  GripVertical
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Login } from "./components/Login";
import { translations, Language } from "./i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SortableMachineProps {
  machine: any;
  t: any;
}

const SortableMachine: React.FC<SortableMachineProps> = ({ machine, t }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: machine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 bg-neutral-950 rounded border border-neutral-800 group",
        isDragging && "border-indigo-500 shadow-lg shadow-indigo-500/20"
      )}
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-neutral-800 rounded text-neutral-600 hover:text-neutral-400 transition-colors">
          <GripVertical className="size-3" />
        </div>
        <Cpu className="size-3 text-neutral-500" />
        <span className="text-xs">{machine.name}</span>
      </div>
      <div className={cn(
        "size-1.5 rounded-full",
        machine.status === 'running' ? "bg-emerald-500" : "bg-rose-500"
      )}></div>
    </div>
  );
}

interface DroppableLineProps {
  id: string;
  name: string;
  machines: any[];
  t: any;
  isUnassigned?: boolean;
}

const DroppableLine: React.FC<DroppableLineProps> = ({ id, name, machines, t, isUnassigned }) => {
  const { setNodeRef, isOver } = useSortable({
    id,
    disabled: true, // We only use it as a container for SortableContext
  });

  return (
    <div 
      className={cn(
        "bg-neutral-950/40 rounded-lg p-3 border transition-colors",
        isOver ? "border-indigo-500 bg-indigo-500/5" : "border-neutral-800/50"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {isUnassigned ? (
          <Activity className="size-3 text-neutral-500" />
        ) : (
          <Layers className="size-3 text-indigo-500" />
        )}
        <span className="text-xs font-bold text-neutral-300">{name}</span>
        <span className="text-[10px] text-neutral-600 ml-auto">{machines.length} {t.machines}</span>
      </div>
      
      <SortableContext items={machines.map(m => m.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-[40px]">
          {machines.map((machine) => (
            <SortableMachine key={machine.id} machine={machine} t={t} />
          ))}
          {machines.length === 0 && (
            <div className="col-span-2 flex items-center justify-center py-4 border border-dashed border-neutral-800 rounded bg-neutral-950/20">
              <p className="text-[10px] text-neutral-600 italic">{t.noMachinesAssigned}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('tb_token'));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tb_token'));
  const [machines, setMachines] = useState<any[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'machine' | 'factory', id: string } | null>(null);
  const [oeeData, setOeeData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [downtime, setDowntime] = useState<any[]>([]);
  const [andonAlerts, setAndonAlerts] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isManualDowntimeModalOpen, setIsManualDowntimeModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [currentPage, setCurrentPage] = useState<'overview' | 'dashboard' | 'production' | 'downtime' | 'maintenance' | 'settings' | 'machine-detail'>('overview');
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [isAddProductionLineModalOpen, setIsAddProductionLineModalOpen] = useState(false);
  const [isAddFactoryModalOpen, setIsAddFactoryModalOpen] = useState(false);
  const [selectedFactoryForLine, setSelectedFactoryForLine] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'en');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeMachineId = active.id as string;
    const overId = over.id as string;

    // Find the machine being dragged
    const machine = machines.find(m => m.id === activeMachineId);
    if (!machine) return;

    // Determine target production line
    // If overId is a production line ID or "unassigned-factoryId"
    let targetLineId: string | null = null;
    let targetFactoryId: string | null = machine.factoryId;

    if (overId.startsWith('unassigned-')) {
      targetLineId = null;
      targetFactoryId = overId.replace('unassigned-', '');
    } else if (productionLines.some(pl => pl.id === overId)) {
      targetLineId = overId;
      targetFactoryId = productionLines.find(pl => pl.id === overId)?.factoryId || machine.factoryId;
    } else {
      // If over a machine, find its production line
      const overMachine = machines.find(m => m.id === overId);
      if (overMachine) {
        targetLineId = overMachine.productionLineId;
        targetFactoryId = overMachine.factoryId;
      }
    }

    // If nothing changed, return
    if (machine.productionLineId === targetLineId && machine.factoryId === targetFactoryId) {
      // If reordering within the same line (optional: implement reordering logic if needed)
      // For now, we just handle assignment/reassignment
      return;
    }

    // Update local state optimistically
    const updatedMachines = machines.map(m => {
      if (m.id === activeMachineId) {
        return { ...m, productionLineId: targetLineId, factoryId: targetFactoryId };
      }
      return m;
    });
    setMachines(updatedMachines);

    // Update backend
    try {
      // 1. Delete old relation if it existed
      if (machine.productionLineId) {
        await fetch("/api/thingsboard/relations", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            fromId: machine.productionLineId,
            fromType: "ASSET",
            toId: machine.id,
            toType: "DEVICE",
            relationType: "Contains"
          })
        });
      }

      // 2. Create new relation if target is a line
      if (targetLineId) {
        await fetch("/api/thingsboard/relations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            fromId: targetLineId,
            fromType: "ASSET",
            toId: machine.id,
            toType: "DEVICE",
            relationType: "Contains"
          })
        });
      }
    } catch (error) {
      console.error("Error updating machine assignment:", error);
      // Revert state on error
      refreshAssets();
    }
  };

  const t = translations[language];

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('tb_token');
    setFactories([]);
    setMachines([]);
    setUser(null);
  };

  const refreshAssets = useCallback(() => {
    if (isAuthenticated && token) {
      Promise.all([
        fetch("/api/thingsboard/factories", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/thingsboard/machines", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/thingsboard/production-lines", { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json())
      ]).then(([factoriesData, machinesData, linesData]) => {
        if (Array.isArray(factoriesData)) setFactories(factoriesData);
        if (Array.isArray(machinesData)) setMachines(machinesData);
        if (Array.isArray(linesData)) setProductionLines(linesData);
        
        if (!selectedEntity) {
          if (machinesData.length > 0) {
            setSelectedEntity({ type: 'machine', id: machinesData[0].id });
          } else if (factoriesData.length > 0) {
            setSelectedEntity({ type: 'factory', id: factoriesData[0].id });
          }
        }
      }).catch(err => console.error("Error fetching TB assets:", err));
    }
  }, [isAuthenticated, token, selectedEntity]);

  const handleAddProductionLine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const lineName = formData.get('lineName') as string;
    const description = formData.get('description') as string;

    try {
      // 1. Create the Production_Line asset in ThingsBoard
      const assetRes = await fetch("/api/thingsboard/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: lineName,
          type: "Production_Line",
          label: lineName,
          additionalInfo: { description }
        })
      });

      if (!assetRes.ok) throw new Error("Failed to create production_line in ThingsBoard");
      const newAsset = await assetRes.json();

      // 2. Create relation to Factory if selected
      if (selectedFactoryForLine) {
        await fetch("/api/thingsboard/relations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            from: { id: selectedFactoryForLine, entityType: "ASSET" },
            to: { id: newAsset.id.id, entityType: "ASSET" },
            type: "Contains"
          })
        });
      }

      refreshAssets();
      setIsAddProductionLineModalOpen(false);
    } catch (error) {
      console.error("Error adding production_line:", error);
      alert("Failed to add production_line to ThingsBoard");
    }
  };

  const handleAddFactory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const factoryName = formData.get('factoryName') as string;
    const factoryProfile = (formData.get('factoryProfile') as string) || 'Factory';

    try {
      const assetRes = await fetch("/api/thingsboard/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: factoryName,
          type: factoryProfile,
          label: factoryName
        })
      });

      if (!assetRes.ok) throw new Error("Failed to create factory in ThingsBoard");
      
      refreshAssets();
      setIsAddFactoryModalOpen(false);
    } catch (error) {
      console.error("Error adding factory:", error);
      alert("Failed to add factory to ThingsBoard");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetch("/api/shifts/current")
      .then(res => res.json())
      .then(data => setCurrentShift(data));
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Fetch User Info
      fetch("/api/thingsboard/user", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      .then(async res => {
        if (res.status === 401) {
          console.warn("Session expired or unauthorized for /api/thingsboard/user. Logging out...");
          handleLogout();
          throw new Error("Session expired. Please login again.");
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.slice(0, 100)}...`);
      })
      .then(data => {
        if (data && data.id) { // Check if it's a valid user object
          setUser(data);
        }
      })
      .catch(err => console.error("Error fetching TB user:", err));

      refreshAssets();
    }
  }, [isAuthenticated, token, refreshAssets]);

  useEffect(() => {
    if (!selectedEntity) return;

    const fetchData = async () => {
      const entityType = selectedEntity.type === 'machine' ? 'DEVICE' : 'ASSET';
      const headers = { "Authorization": `Bearer ${token}` };
      
      try {
        const [telemetryRes, oeeRes, downtimeRes, andonRes] = await Promise.all([
          fetch(`/api/thingsboard/telemetry/${entityType}/${selectedEntity.id}`, { headers }),
          fetch(`/api/thingsboard/oee/${entityType}/${selectedEntity.id}`, { headers }),
          fetch(`/api/downtime/${selectedEntity.id}`),
          fetch(`/api/andon/${selectedEntity.id}`)
        ]);

        if (telemetryRes.status === 401 || oeeRes.status === 401) {
          console.warn("Session expired. Logging out...");
          handleLogout();
          return;
        }

        const handleRes = async (res: Response, setter: (data: any) => void, context: string) => {
          if (!res.ok) {
            console.warn(`${context} failed with status ${res.status}`);
            return;
          }
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            setter(await res.json());
          } else {
            const text = await res.text();
            console.error(`${context} expected JSON but got ${contentType}: ${text.slice(0, 100)}`);
          }
        };

        await Promise.all([
          handleRes(telemetryRes, setTelemetry, "Telemetry"),
          handleRes(oeeRes, setOeeData, "OEE"),
          handleRes(downtimeRes, setDowntime, "Downtime"),
          handleRes(andonRes, setAndonAlerts, "Andon")
        ]);
      } catch (err) {
        console.error("Fetch data error:", err);
      }
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
        if (message.type === "TELEMETRY" && selectedEntity.type === 'machine' && message.data.machineId === selectedEntity.id) {
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
  }, [selectedEntity, token]);

  const handleManualDowntimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedEntity?.type !== 'machine') return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      machineId: selectedEntity.id,
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

  const handleThresholdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEntity) return;

    const formData = new FormData(e.currentTarget);
    const threshold = Number(formData.get("threshold"));
    
    const endpoint = selectedEntity.type === 'machine' 
      ? `/api/machines/${selectedEntity.id}/threshold`
      : `/api/factories/${selectedEntity.id}/threshold`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold })
    });
    
    if (res.ok) {
      if (selectedEntity.type === 'machine') {
        const { machine } = await res.json();
        setMachines(prev => prev.map(m => m.id === machine.id ? machine : m));
      } else {
        const { factory } = await res.json();
        setFactories(prev => prev.map(f => f.id === factory.id ? factory : f));
      }
      setIsThresholdModalOpen(false);
    }
  };

  const currentEntity = selectedEntity?.type === 'machine' 
    ? machines.find(m => m.id === selectedEntity.id)
    : factories.find(f => f.id === selectedEntity?.id);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'th' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  if (!isAuthenticated) {
    return (
      <Login 
        language={language}
        onLogin={(token) => {
          setToken(token);
          setIsAuthenticated(true);
          localStorage.setItem('tb_token', token);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-neutral-950 border-r border-neutral-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out relative",
        isSidebarMinimized ? "w-20" : "w-64"
      )}>
        <div className={cn(
          "p-6 border-b border-neutral-800 flex items-center gap-3 transition-all",
          isSidebarMinimized ? "justify-center px-4" : "px-6"
        )}>
          <div className="size-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 shrink-0">
            <Factory className="text-neutral-400 size-6" />
          </div>
          {!isSidebarMinimized && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-sm font-bold text-neutral-100 leading-none">{t.capteurOee}</h1>
              <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold tracking-widest">{t.oeeSystem}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setCurrentPage('overview')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isSidebarMinimized ? "justify-center" : "",
              currentPage === 'overview' ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
            title={isSidebarMinimized ? t.dashboard : ""}
          >
            <LayoutDashboard className="size-5 shrink-0" />
            {!isSidebarMinimized && <span className="text-sm font-medium animate-in fade-in duration-300">{t.dashboard}</span>}
          </button>
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isSidebarMinimized ? "justify-center" : "",
              currentPage === 'dashboard' ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
            title={isSidebarMinimized ? t.assets : ""}
          >
            <Factory className="size-5 shrink-0" />
            {!isSidebarMinimized && <span className="text-sm font-medium animate-in fade-in duration-300">{t.assets}</span>}
          </button>
          <button 
            onClick={() => setCurrentPage('maintenance')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isSidebarMinimized ? "justify-center" : "",
              currentPage === 'maintenance' ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
            title={isSidebarMinimized ? t.maintenance : ""}
          >
            <Wrench className="size-5 shrink-0" />
            {!isSidebarMinimized && <span className="text-sm font-medium animate-in fade-in duration-300">{t.maintenance}</span>}
          </button>
          <button 
            onClick={() => setCurrentPage('downtime')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isSidebarMinimized ? "justify-center" : "",
              currentPage === 'downtime' ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
            title={isSidebarMinimized ? t.analytics : ""}
          >
            <BarChart2 className="size-5 shrink-0" />
            {!isSidebarMinimized && <span className="text-sm font-medium animate-in fade-in duration-300">{t.analytics}</span>}
          </button>
          <button 
            onClick={() => setCurrentPage('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isSidebarMinimized ? "justify-center" : "",
              currentPage === 'settings' ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
            title={isSidebarMinimized ? t.settings : ""}
          >
            <Settings className="size-5 shrink-0" />
            {!isSidebarMinimized && <span className="text-sm font-medium animate-in fade-in duration-300">{t.settings}</span>}
          </button>
        </nav>
        
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <button className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-100 rounded-lg text-sm font-bold hover:bg-neutral-700 transition-colors",
            isSidebarMinimized ? "px-0" : ""
          )}>
            <Download className="size-4 shrink-0" />
            {!isSidebarMinimized && <span className="animate-in fade-in duration-300">{t.exportReport}</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-all"
          >
            {isSidebarMinimized ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
            {!isSidebarMinimized && <span className="text-xs font-bold uppercase tracking-widest animate-in fade-in duration-300">{t.minimize}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            {currentPage === 'maintenance' ? (
              <div className="flex items-center gap-2">
                <Wrench className="size-5 text-neutral-100" />
                <h2 className="text-lg font-bold">{t.maintenanceDashboard}</h2>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className={cn(
                  "size-3 rounded-full",
                  telemetry?.status === "RUNNING" ? "bg-emerald-500" :
                  telemetry?.status === "IDLE" ? "bg-amber-500" :
                  telemetry?.status === "BREAKDOWN" ? "bg-red-500" : "bg-neutral-500"
                )} />
                <select 
                  className="bg-transparent text-lg font-bold tracking-tight border-none focus:ring-0 cursor-pointer"
                  value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ""}
                  onChange={(e) => {
                    const [type, id] = e.target.value.split(':');
                    setSelectedEntity({ type: type as 'machine' | 'factory', id });
                  }}
                >
                  <optgroup label={t.factories} className="bg-neutral-900 text-neutral-400">
                    {factories.map(f => (
                      <option key={`factory:${f.id}`} value={`factory:${f.id}`} className="text-neutral-100">{f.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label={t.machines} className="bg-neutral-900 text-neutral-400">
                    {machines.map(m => (
                      <option key={`machine:${m.id}`} value={`machine:${m.id}`} className="text-neutral-100">{m.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
            <div className="h-4 w-px bg-neutral-700 mx-2" />
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Clock className="size-4" />
              <span>{t.shift}: <span className="font-mono text-neutral-100">{currentShift?.name || t.loading}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="bg-neutral-800 text-neutral-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors uppercase tracking-widest"
            >
              {language === 'en' ? 'TH' : 'EN'}
            </button>
            <div className="bg-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.operator}:</span>
              <span className="text-sm font-semibold">
                {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : "J. Doe"}
              </span>
            </div>
            <button className="p-2 text-neutral-400 hover:bg-neutral-800 rounded-lg relative">
              <Bell className="size-5" />
              {andonAlerts.length > 0 && (
                <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-neutral-700 transition-colors"
            >
              <LogOut className="size-4" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-900">
          {currentPage === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t.oeeOverall, value: '82.5%', target: '85.0%', trend: '+2.0%', status: 'success' },
                  { label: t.availability, value: '91.4%', target: '90.0%', trend: '+0.5%', status: 'success' },
                  { label: t.performance, value: '93.1%', target: '95.0%', trend: '-0.2%', status: 'danger' },
                  { label: t.qualityRate, value: '97.2%', target: '99.0%', trend: '+0.1%', status: 'success' },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-neutral-500 text-sm font-medium">{kpi.label}</span>
                      <span className={cn(
                        "text-xs font-bold flex items-center gap-1",
                        kpi.status === 'success' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {kpi.status === 'success' ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {kpi.trend}
                      </span>
                    </div>
                    <div className="flex items-end gap-3">
                      <h3 className="text-4xl font-black tracking-tight">{kpi.value}</h3>
                      <div className="h-8 w-24 mb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={Array.from({length: 10}).map((_, i) => ({ val: Math.random() * 20 + 60 }))}>
                            <Area type="monotone" dataKey="val" stroke={kpi.status === 'success' ? "#10b981" : "#ef4444"} fill={kpi.status === 'success' ? "#10b98120" : "#ef444420"} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-4 uppercase font-bold tracking-widest">{t.target}: {kpi.target}</p>
                  </div>
                ))}
              </div>

              {/* Main Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Production vs Target Chart */}
                <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold">{t.productionVsTarget}</h3>
                      <p className="text-xs text-neutral-500">{t.last30Days}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">{t.actual}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full border border-dashed border-neutral-500"></span>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">{t.target}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.from({length: 30}).map((_, i) => ({ 
                        day: i + 1, 
                        actual: 400 + Math.sin(i * 0.5) * 100 + Math.random() * 50,
                        target: 450
                      }))}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="day" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px'}}
                          itemStyle={{fontSize: '12px'}}
                        />
                        <ReferenceLine y={450} stroke="#525252" strokeDasharray="5 5" />
                        <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Losses Donut */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-6">{t.sixBigLosses}</h3>
                  <div className="flex flex-col items-center">
                    <div className="relative size-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: t.equipmentFailure, value: 42, color: '#ef4444' },
                              { name: t.setupAdj, value: 28, color: '#f59e0b' },
                              { name: t.idlingMinorStops, value: 18, color: '#3b82f6' },
                              { name: t.others, value: 12, color: '#525252' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { color: '#ef4444' },
                              { color: '#f59e0b' },
                              { color: '#3b82f6' },
                              { color: '#525252' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black">42h</span>
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">{t.totalLoss}</span>
                      </div>
                    </div>
                    <div className="mt-8 w-full space-y-3">
                      {[
                        { label: t.equipmentFailure, value: '42%', color: 'bg-red-500' },
                        { label: t.setupAdj, value: '28%', color: 'bg-amber-500' },
                        { label: t.idlingMinorStops, value: '18%', color: 'bg-blue-500' },
                      ].map((loss) => (
                        <div key={loss.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", loss.color)}></span>
                            <span className="text-neutral-400">{loss.label}</span>
                          </div>
                          <span className="font-bold">{loss.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Utilization & Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Factory Utilization */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-6">{t.utilizationBySection}</h3>
                  <div className="space-y-6">
                    {(selectedEntity?.type === 'factory' 
                      ? productionLines.filter(pl => pl.factoryId === selectedEntity.id)
                      : productionLines.slice(0, 4)
                    ).map((section, idx) => {
                      const value = 60 + Math.floor(Math.random() * 35);
                      const status = value > 85 ? 'success' : value > 70 ? 'warning' : 'danger';
                      return (
                        <div key={section.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-neutral-300">{section.name}</span>
                            <span className={cn(
                              "font-bold",
                              status === 'success' ? "text-emerald-500" : status === 'warning' ? "text-amber-500" : "text-red-500"
                            )}>{value}%</span>
                          </div>
                          <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                            <div className={cn(
                              "h-full transition-all duration-1000",
                              status === 'success' ? "bg-emerald-500" : status === 'warning' ? "bg-amber-500" : "bg-red-500"
                            )} style={{ width: `${value}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {productionLines.length === 0 && (
                      <p className="text-sm text-neutral-500 italic">{t.noProductionLines}</p>
                    )}
                  </div>
                </div>

                {/* Alerts Summary */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">{t.criticalAlerts}</h3>
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded uppercase tracking-widest">4 {t.active}</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { title: 'Cooling System Failure', time: '12 min ago', desc: 'Line A - Fabrication Section 04. Overheating detected.', type: 'danger' },
                      { title: 'Low Material Level', time: '45 min ago', desc: 'Station 12 - Resin supply below 10% threshold.', type: 'warning' },
                      { title: 'Planned Maintenance Overdue', time: '2 hrs ago', desc: 'CNC Machine #09 - Quarterly service required.', type: 'warning' },
                    ].map((alert, i) => (
                      <div key={i} className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border-l-4",
                        alert.type === 'danger' ? "bg-red-500/5 border-red-500" : "bg-amber-500/5 border-amber-500"
                      )}>
                        <AlertTriangle className={cn("size-5 shrink-0", alert.type === 'danger' ? "text-red-500" : "text-amber-500")} />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <p className="text-sm font-bold">{alert.title}</p>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase">{alert.time}</span>
                          </div>
                          <p className="text-xs text-neutral-400">{alert.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 border border-neutral-800 rounded-lg transition-colors">
                    {t.viewAllAlerts}
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Assets Page Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tight mb-2">{t.mainFloor}</h1>
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <button 
                      onClick={() => setCurrentPage('overview')}
                      className="flex items-center gap-1 hover:text-neutral-300 transition-colors font-bold"
                    >
                      <ChevronLeft className="size-4" />
                      {t.back}
                    </button>
                    <span className="h-4 w-px bg-neutral-800" />
                    <span className="font-medium">{t.lastUpdated}: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: t.overallUtilization, value: '59%' },
                    { label: t.avgUptime, value: '00h 58m' },
                    { label: t.avgDowntimeEvents, value: '0.8' },
                    { label: t.avgDowntimeLength, value: '00h 29m' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-left lg:text-right">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-xl font-black text-neutral-100">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {machines
                  .filter(m => !selectedEntity || selectedEntity.type !== 'factory' || m.factoryId === selectedEntity.id)
                  .map((machine, idx) => {
                  // Mock some data for each machine to make it look like the reference
                  const isSelected = selectedEntity?.id === machine.id;
                  const status = idx % 4 === 0 ? 'RUNNING' : idx % 4 === 1 ? 'IDLE' : idx % 4 === 2 ? 'BREAKDOWN' : 'RUNNING';
                  const utilization = 60 + Math.random() * 30;
                  const oee = 50 + Math.random() * 20;
                  const quality = 90 + Math.random() * 8;
                  const goodParts = 20 + Math.floor(Math.random() * 50);
                  const scrap = Math.floor(Math.random() * 5);
                  const cycleTime = (2 + Math.random()).toFixed(2);
                  const targetCycleTime = "2.23";
                  
                  return (
                    <div 
                      key={machine.id}
                      className={cn(
                        "bg-neutral-950 border rounded-xl overflow-hidden transition-all cursor-pointer group",
                        isSelected ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-neutral-800 hover:border-neutral-700"
                      )}
                      onClick={() => {
                        setSelectedEntity({ type: 'machine', id: machine.id });
                        setCurrentPage('machine-detail');
                      }}
                    >
                      {/* Card Header */}
                      <div className={cn(
                        "p-4 flex items-center justify-between border-b border-neutral-800",
                        status === 'RUNNING' ? "bg-emerald-500/5" : status === 'IDLE' ? "bg-amber-500/5" : "bg-red-500/5"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "size-8 rounded-full flex items-center justify-center",
                            status === 'RUNNING' ? "bg-emerald-500/20 text-emerald-500" : 
                            status === 'IDLE' ? "bg-amber-500/20 text-amber-500" : "bg-red-500/20 text-red-500"
                          )}>
                            {status === 'RUNNING' ? <CheckCircle2 className="size-5" /> : 
                             status === 'IDLE' ? <PauseCircle className="size-5" /> : <AlertCircle className="size-5" />}
                          </div>
                          <h3 className="font-black text-lg uppercase tracking-tight">{machine.name}</h3>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic">{t.firstShift}</span>
                      </div>

                      {/* Timeline Bar */}
                      <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/30">
                        <div className="flex justify-between text-[8px] text-neutral-600 mb-1 font-mono font-bold">
                          <span>08:00</span>
                          <span>10:00</span>
                          <span>12:00</span>
                          <span>14:00</span>
                          <span>16:00</span>
                          <span>18:00</span>
                        </div>
                        <div className="h-4 bg-neutral-800 rounded-sm overflow-hidden flex">
                          <div className="h-full bg-emerald-500 w-[40%]" />
                          <div className="h-full bg-amber-500 w-[10%]" />
                          <div className="h-full bg-emerald-500 w-[25%]" />
                          <div className="h-full bg-red-500 w-[5%]" />
                          <div className="h-full bg-emerald-500 w-[20%]" />
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-6">
                        {/* Operator & Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t.operatorPart}</p>
                            <p className="text-sm font-bold text-neutral-100">James Leener</p>
                            <p className="text-[10px] text-neutral-500 font-mono">34414</p>
                          </div>
                          <div className="text-right">
                            {status === 'BREAKDOWN' && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                                <AlertTriangle className="size-3" />
                                <span className="text-[10px] font-bold uppercase">{t.downtimeMin} (25)</span>
                              </div>
                            )}
                            {status === 'IDLE' && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <User className="size-3" />
                                <span className="text-[10px] font-bold uppercase">{t.noOperator} (15)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.goodParts}</p>
                            <p className="text-xl font-black text-emerald-500">{goodParts}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.scrap}</p>
                            <p className="text-xl font-black text-red-500">{scrap}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.utilization}</p>
                            <p className="text-xl font-black text-neutral-100">{utilization.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.cycleTime}</p>
                            <p className="text-sm font-bold text-red-500">{cycleTime}m <span className="text-[10px] text-neutral-500 font-normal">({targetCycleTime}m)</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.quality}</p>
                            <p className="text-sm font-bold text-neutral-100">{quality.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">OEE</p>
                            <p className="text-sm font-bold text-neutral-100">{oee.toFixed(2)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentPage === 'production' && (
            <div className="space-y-6">
              {/* Top Section: OEE Metrics & Machine Status */}
              <div className="grid grid-cols-12 gap-6">
                {/* Line Section OEE */}
                <div className="col-span-12 lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">{t.lineOeeBreakdown}</h3>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{t.target}: 85%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.totalLineOee}</p>
                      <p className="text-2xl font-black text-neutral-100">82.5%</p>
                      <div className="mt-2 h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '82.5%' }}></div>
                      </div>
                      <p className="mt-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <TrendingUp className="size-3" /> +1.2% from last hour
                      </p>
                    </div>
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.stampingSection}</p>
                      <p className="text-2xl font-black text-neutral-100">78.1%</p>
                      <div className="mt-2 h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: '78.1%' }}></div>
                      </div>
                      <p className="mt-2 text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <TrendingDown className="size-3" /> -2.4% {t.bottleneckDetected}
                      </p>
                    </div>
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.weldingSection}</p>
                      <p className="text-2xl font-black text-neutral-100">91.4%</p>
                      <div className="mt-2 h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '91.4%' }}></div>
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-500 font-bold">{t.stablePerformance}</p>
                    </div>
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">{t.finishingSection}</p>
                      <p className="text-2xl font-black text-neutral-100">84.0%</p>
                      <div className="mt-2 h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '84%' }}></div>
                      </div>
                      <p className="mt-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <TrendingUp className="size-3" /> +0.5%
                      </p>
                    </div>
                  </div>
                </div>
                {/* Machine Status Grid Summary */}
                <div className="col-span-12 lg:col-span-4 flex flex-col">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">{t.realTimeMachineStatus}</h3>
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-500/80">ST-01</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-red-500/80">ST-02</span>
                      <AlertCircle className="size-4 text-red-500" />
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-500/80">WD-01</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-500/80">WD-02</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-amber-500/80">FN-01</span>
                      <PauseCircle className="size-4 text-amber-500" />
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-500/80">FN-02</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-500/80">QC-01</span>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    </div>
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 flex flex-col items-center justify-center gap-1 opacity-50">
                      <span className="text-[10px] font-bold text-neutral-400">PK-01</span>
                      <Power className="size-4 text-neutral-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualization Section */}
              <div className="grid grid-cols-12 gap-6">
                {/* Shift OEE Comparison */}
                <div className="col-span-12 lg:col-span-8 bg-neutral-950 rounded-xl border border-neutral-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <History className="size-4 text-indigo-500" />
                      {t.comparingOeeMetrics}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                      <span>{t.last3Shifts}</span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Shift A (Morning)', oee: 84, availability: 92, performance: 88, quality: 98 },
                          { name: 'Shift B (Afternoon)', oee: 78, availability: 85, performance: 82, quality: 96 },
                          { name: 'Shift C (Night)', oee: 81, availability: 88, performance: 85, quality: 99 },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', fontSize: '12px'}}
                          itemStyle={{fontSize: '11px'}}
                          cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em', paddingBottom: '20px' }}
                        />
                        <Bar dataKey="oee" name="OEE" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="availability" name="Availability" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="performance" name="Performance" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="quality" name="Quality" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bottleneck Funnel Chart */}
                <div className="col-span-12 lg:col-span-4 bg-neutral-950 rounded-xl border border-neutral-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Filter className="size-4 text-amber-500" />
                      Production Throughput (Units/Hr)
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-bold uppercase tracking-widest">
                        <span>Stamping</span>
                        <span className="text-neutral-100">450</span>
                      </div>
                      <div className="h-8 bg-neutral-900 rounded-lg overflow-hidden flex">
                        <div className="bg-indigo-600/80 h-full w-[100%]"></div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-bold uppercase tracking-widest">
                        <span>Welding</span>
                        <span className="text-neutral-100">420</span>
                      </div>
                      <div className="h-8 bg-neutral-900 rounded-lg overflow-hidden flex">
                        <div className="bg-indigo-500/80 h-full w-[93%]"></div>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="flex justify-between text-[10px] text-red-500 mb-1 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1">Assembly <AlertTriangle className="size-3" /></span>
                        <span>280</span>
                      </div>
                      <div className="h-8 bg-neutral-900 rounded-lg overflow-hidden flex border border-red-500/50">
                        <div className="bg-red-500/80 h-full w-[62%]"></div>
                      </div>
                      <div className="absolute -right-2 top-0 h-full flex items-center">
                        <span className="text-[10px] text-red-500 bg-red-500/10 px-1 py-0.5 rounded ml-4 whitespace-nowrap font-bold">{t.bottleneckDetected}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-bold uppercase tracking-widest">
                        <span>Testing</span>
                        <span className="text-neutral-100">275</span>
                      </div>
                      <div className="h-8 bg-neutral-900 rounded-lg overflow-hidden flex">
                        <div className="bg-indigo-400/80 h-full w-[61%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Downtime Pareto Chart */}
                <div className="col-span-12 lg:col-span-8 bg-neutral-950 rounded-xl border border-neutral-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <BarChart2 className="size-4 text-red-500" />
                      Downtime Pareto Analysis
                    </h4>
                    <select className="bg-neutral-900 border-none text-[10px] font-bold uppercase tracking-widest rounded-lg py-1 px-3 text-neutral-400 focus:ring-0">
                      <option>{t.last24Hours}</option>
                      <option>{t.last7Days}</option>
                    </select>
                  </div>
                  <div className="h-48 flex items-end gap-6 px-4">
                    {[
                      { label: 'Tool Wear', val: 85, cum: 85 },
                      { label: 'Mtrl Jam', val: 60, cum: 92 },
                      { label: 'Sensor Err', val: 45, cum: 96 },
                      { label: 'Setup', val: 25, cum: 98 },
                      { label: 'Others', val: 10, cum: 100 }
                    ].map((item) => (
                      <div key={item.label} className="flex-1 flex flex-col items-center group">
                        <div className="w-full bg-neutral-900/50 rounded-t-lg relative flex items-end" style={{ height: '100%' }}>
                          <div className="w-full bg-indigo-500 rounded-t-lg transition-all group-hover:bg-indigo-400" style={{ height: `${item.val}%` }}></div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-2 bg-amber-500 rounded-full ring-2 ring-neutral-950 z-10" style={{ bottom: `${item.cum}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 mt-2 truncate w-full text-center uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center gap-8 text-[10px] uppercase font-bold tracking-widest">
                    <div className="flex items-center gap-2">
                      <span className="size-2 bg-indigo-500 rounded-sm"></span>
                      <span className="text-neutral-500">{t.durationMin}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 bg-amber-500 rounded-full"></span>
                      <span className="text-neutral-500">{t.cumulativePercent}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Shift Performance */}
              <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <History className="size-4 text-indigo-500" />
                      Historical Shift Performance
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">Comparing OEE metrics across the last 3 rotations</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {[
                    { name: 'Morning Shift', oee: 88.2, a: 88, p: 92, q: 85, status: 'success' },
                    { name: 'Afternoon Shift (Current)', oee: 82.5, a: 82, p: 80, q: 86, status: 'warning' },
                    { name: 'Night Shift', oee: 76.4, a: 76, p: 72, q: 80, status: 'neutral' }
                  ].map((shift) => (
                    <div key={shift.name} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{shift.name}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          shift.status === 'success' ? "text-emerald-500" : shift.status === 'warning' ? "text-amber-500" : "text-neutral-500"
                        )}>{shift.oee}% OEE</span>
                      </div>
                      <div className="flex items-end gap-2 h-24">
                        <div className="flex-1 bg-neutral-900 rounded-t-sm relative group h-full">
                          <div className="absolute inset-0 bg-indigo-500/80 rounded-t-sm bottom-0 top-auto" style={{ height: `${shift.a}%` }}></div>
                        </div>
                        <div className="flex-1 bg-neutral-900 rounded-t-sm relative group h-full">
                          <div className="absolute inset-0 bg-emerald-500/80 rounded-t-sm bottom-0 top-auto" style={{ height: `${shift.p}%` }}></div>
                        </div>
                        <div className="flex-1 bg-neutral-900 rounded-t-sm relative group h-full">
                          <div className="absolute inset-0 bg-violet-500/80 rounded-t-sm bottom-0 top-auto" style={{ height: `${shift.q}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-neutral-800 flex justify-center gap-12">
                  <div className="flex items-center gap-3">
                    <span className="size-3 bg-indigo-500/80 rounded-sm"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{t.availability}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="size-3 bg-emerald-500/80 rounded-sm"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{t.performance}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="size-3 bg-violet-500/80 rounded-sm"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{t.qualityRate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'downtime' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Downtime Analysis</h2>
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                  <h3 className="font-bold mb-6">Pareto Analysis (Top Reasons)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={
                        (Object.entries(
                          downtime.reduce((acc, d) => {
                            acc[d.reason] = (acc[d.reason] || 0) + ((d.endTime || Date.now()) - d.startTime) / 1000 / 60;
                            return acc;
                          }, {} as Record<string, number>)
                        ) as [string, number][])
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, mins]) => ({ reason, mins }))
                      }>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="reason" stroke="#525252" fontSize={12} />
                        <YAxis stroke="#525252" fontSize={12} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px'}}
                        />
                        <Bar dataKey="mins" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
                    <h3 className="font-bold mb-4">Downtime Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">Total Events</span>
                        <span className="text-lg font-bold">{downtime.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">Total Duration</span>
                        <span className="text-lg font-bold">
                          {Math.round(downtime.reduce((acc, d) => acc + ((d.endTime || Date.now()) - d.startTime) / 1000 / 60, 0))}m
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">MTTR (Mean Time to Repair)</span>
                        <span className="text-lg font-bold">
                          {downtime.length > 0 ? Math.round(downtime.reduce((acc, d) => acc + ((d.endTime || Date.now()) - d.startTime) / 1000 / 60, 0) / downtime.length) : 0}m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'maintenance' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-4xl font-black tracking-tight mb-2">{t.maintenanceOverview}</h1>
                <p className="text-neutral-400">{t.maintenanceDescription}</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <p className="text-sm font-medium text-neutral-500 mb-2">{t.mtbf}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-bold">452 hrs</h3>
                      <p className="text-emerald-500 text-sm font-semibold flex items-center gap-1">
                        <TrendingUp className="size-3" /> +5.2%
                      </p>
                    </div>
                    <Clock className="text-neutral-800 size-10" />
                  </div>
                </div>
                <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <p className="text-sm font-medium text-neutral-500 mb-2">{t.mttr}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-bold">2.4 hrs</h3>
                      <p className="text-amber-500 text-sm font-semibold flex items-center gap-1">
                        <TrendingDown className="size-3" /> -12.1%
                      </p>
                    </div>
                    <Hammer className="text-neutral-800 size-10" />
                  </div>
                </div>
                <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <p className="text-sm font-medium text-neutral-500 mb-2">{t.pendingOrders}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-bold">18</h3>
                      <p className="text-neutral-400 text-sm font-semibold">4 {t.highPriority}</p>
                    </div>
                    <ClipboardList className="text-neutral-800 size-10" />
                  </div>
                </div>
                <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                  <p className="text-sm font-medium text-neutral-500 mb-2">{t.systemHealth}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl font-bold">94.2%</h3>
                      <p className="text-emerald-500 text-sm font-semibold">{t.optimalRange}</p>
                    </div>
                    <HeartPulse className="text-neutral-800 size-10" />
                  </div>
                </div>
              </div>

              {/* Middle Section: Machine Health & Failure Prediction */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Machine Health Status */}
                <div className="lg:col-span-2 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold">{t.machineHealthStatus}</h3>
                    <button className="text-sm text-neutral-500 hover:text-white font-medium">{t.viewAllAssets}</button>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: 'CNC Lathe-01', status: t.stable, uptime: '142h', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { name: 'Injection-04', status: t.warning, uptime: 'Temp Anomaly', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { name: 'Robot Arm-02', status: t.critical, uptime: 'Actuator Failure', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
                        { name: 'Press-A12', status: t.stable, uptime: '89h', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                      ].map((machine) => (
                        <div key={machine.name} className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
                          <div className="flex justify-between items-start mb-4">
                            <machine.icon className={cn("size-5", machine.color)} />
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase", machine.bg, machine.color)}>{machine.status}</span>
                          </div>
                          <h4 className="text-sm font-bold truncate">{machine.name}</h4>
                          <p className="text-xs text-neutral-500 mt-1">{machine.uptime}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Failure Prediction */}
                <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-6 border-b border-neutral-800 flex items-center gap-2">
                    <Brain className="size-5 text-indigo-500" />
                    <h3 className="text-lg font-bold">{t.failurePrediction}</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {[
                      { name: 'Pneumatic Line B', risk: 88, time: '4.5 hrs', color: 'bg-red-500' },
                      { name: 'Cooling Unit-01', risk: 42, time: '3 days', color: 'bg-amber-500' },
                      { name: 'Conveyor Motor-C', risk: 12, time: '14 days', color: 'bg-neutral-500' },
                    ].map((prediction) => (
                      <div key={prediction.name} className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-neutral-400">{prediction.name}</span>
                          <span className={cn("font-bold", prediction.risk > 80 ? "text-red-500" : prediction.risk > 40 ? "text-amber-500" : "text-neutral-400")}>{prediction.risk}% {t.risk}</span>
                        </div>
                        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                          <div className={cn("h-full", prediction.color)} style={{ width: `${prediction.risk}%` }}></div>
                        </div>
                        <p className="text-[10px] text-neutral-500 italic">{t.estimatedFailureIn}: {prediction.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Section: Work Orders & Schedule */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Work Orders Table */}
                <div className="xl:col-span-2 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold">{t.workOrders}</h3>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-neutral-800 text-xs font-bold rounded">{t.all}</button>
                      <button className="px-3 py-1 hover:bg-neutral-800 text-xs font-bold rounded transition-colors">{t.critical}</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-900/50 text-[11px] uppercase tracking-wider text-neutral-500">
                        <tr>
                          <th className="px-6 py-3 font-bold">{t.orderId}</th>
                          <th className="px-6 py-3 font-bold">{t.asset}</th>
                          <th className="px-6 py-3 font-bold">{t.priority}</th>
                          <th className="px-6 py-3 font-bold">{t.technician}</th>
                          <th className="px-6 py-3 font-bold">{t.status}</th>
                          <th className="px-6 py-3 font-bold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {[
                          { id: '#WO-9281', asset: 'Robot Arm-02', priority: t.critical, tech: 'Mike Ross', status: t.inProgress, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                          { id: '#WO-9285', asset: 'Injection-04', priority: t.warning, tech: 'Sarah Jen', status: t.pending, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                          { id: '#WO-9302', asset: 'Press-A12', priority: t.stable, tech: 'Unassigned', status: t.scheduled, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                        ].map((order) => (
                          <tr key={order.id} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold">{order.id}</td>
                            <td className="px-6 py-4 text-sm">{order.asset}</td>
                            <td className="px-6 py-4">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", order.bg, order.color, order.border)}>{order.priority}</span>
                            </td>
                            <td className="px-6 py-4 text-sm">{order.tech}</td>
                            <td className="px-6 py-4 text-sm">{order.status}</td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-neutral-500 hover:text-white transition-colors">
                                <MoreHorizontal className="size-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preventive Maintenance Schedule */}
                <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
                  <div className="p-6 border-b border-neutral-800">
                    <h3 className="text-lg font-bold">{t.preventiveSchedule}</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    {[
                      { month: 'Oct', day: '24', title: t.monthlyCalibration, asset: 'CNC Hub Alpha (3 Units)', time: '08:00 AM' },
                      { month: 'Oct', day: '26', title: t.hydraulicInspection, asset: 'Packaging Line 1-4', time: '10:30 AM', opacity: 'opacity-75' },
                      { month: 'Oct', day: '28', title: t.filterReplacement, asset: 'Ventilation System B', time: '02:00 PM', opacity: 'opacity-75' },
                    ].map((item, i) => (
                      <div key={i} className={cn("flex gap-4", item.opacity)}>
                        <div className="flex flex-col items-center justify-center min-w-12 h-12 bg-neutral-900 rounded-lg">
                          <span className="text-[10px] font-bold uppercase text-neutral-500">{item.month}</span>
                          <span className="text-lg font-black leading-none">{item.day}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{item.title}</h4>
                          <p className="text-xs text-neutral-500">{item.asset}</p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                            <Clock className="size-3" /> {item.time}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-2 bg-neutral-900 text-sm font-bold rounded-lg hover:bg-neutral-800 transition-colors mt-4">
                      {t.viewFullCalendar}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Machine Detail Page */}
          {currentPage === 'machine-detail' && currentEntity && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentPage('dashboard')}
                    className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                      <Cpu className="text-indigo-400 size-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{currentEntity.name}</h2>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 uppercase font-bold tracking-widest">
                        <span>First Shift</span>
                        <span className="size-1 rounded-full bg-neutral-700"></span>
                        <span>Mon 02/12</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-1">{t.operator}</p>
                    <p className="text-sm font-bold">Sumail H.</p>
                    <p className="text-[10px] text-neutral-600">Since 8:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-1">{t.totalParts}</p>
                    <p className="text-sm font-bold">-14 {t.total} <span className="text-neutral-500 font-normal text-[10px]">{t.ofPart} 34616</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-1">{t.downtime}</p>
                    <p className="text-sm font-bold text-neutral-500">{t.noDowntimeEvents}</p>
                  </div>
                </div>
              </div>

              {/* OEE Performance Chart */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">OEE Performance</h3>
                    <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mt-1">Hourly Trend vs Target</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Actual OEE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 border-t border-dashed border-neutral-500"></div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Target ({currentEntity.oeeThreshold || 85}%)</span>
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { hour: '8:00', oee: 52 },
                      { hour: '9:00', oee: 68 },
                      { hour: '10:00', oee: 45 },
                      { hour: '11:00', oee: 92 },
                      { hour: '12:00', oee: 88 },
                      { hour: '13:00', oee: 75 },
                      { hour: '14:00', oee: 82 },
                      { hour: '15:00', oee: 95 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis 
                        dataKey="hour" 
                        stroke="#525252" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#525252" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', fontSize: '12px'}}
                        itemStyle={{color: '#818cf8'}}
                        cursor={{stroke: '#262626'}}
                      />
                      <ReferenceLine 
                        y={currentEntity.oeeThreshold || 85} 
                        stroke="#525252" 
                        strokeDasharray="5 5"
                        label={{ 
                          position: 'right', 
                          value: `Goal: ${currentEntity.oeeThreshold || 85}%`, 
                          fill: '#525252', 
                          fontSize: 10,
                          fontWeight: 'bold'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="oee" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#0a0a0a' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hourly Stats Table */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900/50">
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Hour</th>
                        <th className="px-2 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Status</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Parts</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Pcs / Min</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Utz</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Cycle</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Downtime Reasons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {[
                        { hour: 'Hour 1', time: '8:00AM - 9:00AM', uptime: '58 min', parts: 4, targetParts: 6, pcsMin: 0.06, targetPcsMin: 0.1, utz: 55, targetUtz: 80, cycle: 15, targetCycle: 10, downtimeReason: 'Set up', status: 'idle' },
                        { hour: 'Hour 2', time: '9:00AM - 10:00AM', uptime: '55 min', parts: 4, targetParts: 6, pcsMin: 0.06, targetPcsMin: 0.1, utz: 65, targetUtz: 80, cycle: 15, targetCycle: 10, downtimeReason: 'No Downtime Events', status: 'running' },
                        { hour: 'Hour 3', time: '10:00AM - 11:00AM', uptime: '55 min', parts: 6, targetParts: 6, pcsMin: 0.1, targetPcsMin: 0.1, utz: 85, targetUtz: 80, cycle: 10, targetCycle: 10, downtimeReason: 'Machine breakdown', status: 'breakdown' },
                        { hour: 'Hour 4', time: '11:00AM - 12:00PM', uptime: '60 min', parts: 7, targetParts: 6, pcsMin: 0.12, targetPcsMin: 0.1, utz: 100, targetUtz: 80, cycle: 8.6, targetCycle: 10, downtimeReason: 'No Downtime Events', status: 'running' },
                        { hour: 'Hour 5', time: '12:00PM - 1:00PM', uptime: '55 min', parts: 7, targetParts: 6, pcsMin: 0.12, targetPcsMin: 0.1, utz: 90, targetUtz: 80, cycle: 8.6, targetCycle: 10, downtimeReason: 'No Downtime Events', status: 'running' },
                      ].map((row, idx) => (
                        <tr key={idx} className="group hover:bg-neutral-900/50 transition-colors">
                          <td className="px-6 py-6">
                            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-1">{row.hour}</p>
                            <p className="text-sm font-bold">{row.time}</p>
                            <p className="text-[10px] text-neutral-600 mt-1">{row.uptime} {t.uptime}</p>
                          </td>
                          <td className="px-2 py-6">
                            <div className="flex flex-col gap-1 h-16 w-3 rounded-full bg-neutral-800 overflow-hidden">
                              <div className={cn("flex-1", row.status === 'running' ? "bg-emerald-500" : row.status === 'idle' ? "bg-amber-500" : "bg-rose-500")}></div>
                              <div className={cn("flex-1 opacity-50", row.status === 'running' ? "bg-emerald-500" : "bg-neutral-800")}></div>
                              <div className={cn("flex-1 opacity-30", row.status === 'running' ? "bg-emerald-500" : "bg-neutral-800")}></div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className={cn("text-2xl font-bold", row.parts >= row.targetParts ? "text-emerald-500" : "text-rose-500")}>{row.parts}</span>
                              </div>
                              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", row.parts >= row.targetParts ? "bg-emerald-500" : "bg-rose-500")}
                                  style={{ width: `${Math.min(100, (row.parts / row.targetParts) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">{t.target}: {row.targetParts}</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className={cn("text-2xl font-bold", row.pcsMin >= row.targetPcsMin ? "text-emerald-500" : "text-rose-500")}>.{Math.round(row.pcsMin * 100)}</span>
                              </div>
                              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", row.pcsMin >= row.targetPcsMin ? "bg-emerald-500" : "bg-rose-500")}
                                  style={{ width: `${Math.min(100, (row.pcsMin / row.targetPcsMin) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">{t.target}: {row.targetPcsMin}</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className={cn("text-2xl font-bold", row.utz >= row.targetUtz ? "text-emerald-500" : "text-rose-500")}>{row.utz}%</span>
                              </div>
                              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", row.utz >= row.targetUtz ? "bg-emerald-500" : "bg-rose-500")}
                                  style={{ width: `${Math.min(100, (row.utz / row.targetUtz) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">{t.target}: {row.targetUtz}%</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className={cn("text-2xl font-bold", row.cycle <= row.targetCycle ? "text-emerald-500" : "text-rose-500")}>{row.cycle}m</span>
                              </div>
                              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full transition-all duration-500", row.cycle <= row.targetCycle ? "bg-emerald-500" : "bg-rose-500")}
                                  style={{ width: `${Math.min(100, (row.targetCycle / row.cycle) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">{t.target}: {row.targetCycle}m</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-wrap gap-2">
                              {row.downtimeReason === 'No Downtime Events' ? (
                                <span className="px-3 py-1 bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest rounded-full">{t.noDowntimeEvents}</span>
                              ) : (
                                <span className={cn(
                                  "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full",
                                  row.status === 'idle' ? "bg-amber-500/20 text-amber-500" : "bg-rose-500/20 text-rose-500"
                                )}>
                                  {row.downtimeReason}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-2xl font-bold">{t.systemSettings}</h2>
              <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-6">
                <div>
                  <h3 className="font-bold mb-4">{t.generalConfiguration}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.realTimeTelemetry}</p>
                        <p className="text-xs text-neutral-500">{t.enableWebSocket}</p>
                      </div>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 size-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.emailAlerts}</p>
                        <p className="text-xs text-neutral-500">{t.sendNotifications}</p>
                      </div>
                      <div className="w-10 h-5 bg-neutral-800 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 size-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-neutral-800">
                  <h3 className="font-bold mb-4">{t.displayOptions}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.language}</p>
                      <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                        <button 
                          onClick={() => setLanguage('en')}
                          className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                            language === 'en' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-neutral-500 hover:text-neutral-300"
                          )}
                        >
                          English
                        </button>
                        <button 
                          onClick={() => setLanguage('th')}
                          className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                            language === 'th' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-neutral-500 hover:text-neutral-300"
                          )}
                        >
                          ไทย
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">{t.assetHierarchy}</h3>
                    <button 
                      onClick={() => setIsAddFactoryModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="size-3" />
                      {t.addFactory}
                    </button>
                  </div>
                  
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {factories.filter(f => f.profile === 'Factory' || f.type === 'Factory').map(factory => (
                        <div key={factory.id} className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
                          <div className="flex items-center gap-2 mb-3">
                            <Factory className="size-4 text-indigo-400" />
                            <span className="text-sm font-bold">{factory.name}</span>
                            <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-500 uppercase font-bold tracking-widest ml-2">
                              {factory.profile || t.factory}
                            </span>
                            {factory.type === 'thingsboard' && (
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest ml-2 border border-indigo-500/20">ThingsBoard</span>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedFactoryForLine(factory.id);
                                setIsAddProductionLineModalOpen(true);
                              }}
                              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-indigo-400 transition-colors ml-auto"
                              title={t.addProductionLine}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {/* Production_Lines */}
                            {productionLines.filter(pl => pl.factoryId === factory.id).map(line => (
                              <DroppableLine 
                                key={line.id} 
                                id={line.id} 
                                name={line.name} 
                                machines={machines.filter(m => m.factoryId === factory.id && m.productionLineId === line.id)}
                                t={t}
                              />
                            ))}

                            {/* Machines without a line */}
                            <DroppableLine 
                              id={`unassigned-${factory.id}`}
                              name={t.unassignedMachines || "Unassigned Machines"}
                              machines={machines.filter(m => m.factoryId === factory.id && !productionLines.some(pl => pl.id === m.productionLineId))}
                              t={t}
                              isUnassigned
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <DragOverlay dropAnimation={{
                      sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                          active: {
                            opacity: '0.5',
                          },
                        },
                      }),
                    }}>
                      {activeId ? (
                        <div className="flex items-center justify-between p-2 bg-neutral-950 rounded border border-indigo-500 shadow-2xl shadow-indigo-500/40 w-[300px]">
                          <div className="flex items-center gap-2">
                            <GripVertical className="size-3 text-indigo-400" />
                            <Cpu className="size-3 text-neutral-500" />
                            <span className="text-xs">{machines.find(m => m.id === activeId)?.name}</span>
                          </div>
                          <div className={cn(
                            "size-1.5 rounded-full",
                            machines.find(m => m.id === activeId)?.status === 'running' ? "bg-emerald-500" : "bg-rose-500"
                          )}></div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>

                <div className="pt-6 border-t border-neutral-800">
                  <h3 className="font-bold mb-4">{t.deviceSettings}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.sensorSensitivity}</p>
                        <p className="text-xs text-neutral-500">{t.adjustSensitivity}</p>
                      </div>
                      <select defaultValue="Medium" className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs outline-none">
                        <option value="Low">{t.low}</option>
                        <option value="Medium">{t.medium}</option>
                        <option value="High">{t.high}</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Data Sampling Rate</p>
                        <p className="text-xs text-neutral-500">Frequency of telemetry data collection</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={5} className="w-16 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs outline-none" />
                        <span className="text-xs text-neutral-500">Hz</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.autoCalibration}</p>
                        <p className="text-xs text-neutral-500">{t.autoCalibrationDesc}</p>
                      </div>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 size-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-800">
                  <h3 className="font-bold mb-4">{t.display}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.fullScreenMode}</p>
                      <p className="text-xs text-neutral-500">{t.fullScreenDesc}</p>
                    </div>
                    <div className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono text-neutral-300">
                      F12
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-neutral-800">
                  <h3 className="font-bold mb-4">{t.dataManagement}</h3>
                  <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors">
                    {t.exportShiftReport}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Manual Downtime Modal */}
      {isManualDowntimeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{t.logManualDowntime}</h2>
            <form onSubmit={handleManualDowntimeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">{t.startTime}</label>
                  <input type="datetime-local" name="startTime" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">{t.endTime}</label>
                  <input type="datetime-local" name="endTime" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.type}</label>
                <select name="downtime_type" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="PLANNED">{t.planned}</option>
                  <option value="UNPLANNED">{t.unplanned}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.reason}</label>
                <input type="text" name="downtime_reason" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.reasonPlaceholder} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.comment}</label>
                <textarea name="comment" rows={3} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.commentPlaceholder}></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsManualDowntimeModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">{t.saveLog}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Threshold Modal */}
      {isThresholdModalOpen && currentEntity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-2">{t.editOeeTarget}</h2>
            <p className="text-sm text-neutral-400 mb-6">{t.setTargetOee} {currentEntity.name}. {t.alertsWillTrigger}</p>
            <form onSubmit={handleThresholdSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.targetThreshold} (%)</label>
                <input 
                  type="number" 
                  name="threshold" 
                  min="0" 
                  max="100" 
                  step="1"
                  defaultValue={currentEntity.oeeThreshold || 0}
                  required 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsThresholdModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">{t.cancel}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">{t.saveTarget}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Production_Line Modal */}
      {isAddProductionLineModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Layers className="size-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t.addProductionLine}</h2>
                <p className="text-xs text-neutral-500">{t.createNewLineFor} {factories.find(f => f.id === selectedFactoryForLine)?.name}</p>
              </div>
            </div>
            <form onSubmit={handleAddProductionLine} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.lineName}</label>
                <input 
                  type="text" 
                  name="lineName" 
                  required 
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder={t.lineNamePlaceholder} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.descriptionOptional}</label>
                <textarea 
                  name="description" 
                  rows={3} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder={t.descriptionPlaceholder}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddProductionLineModalOpen(false)} 
                  className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t.createLine}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Factory Modal */}
      {isAddFactoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Factory className="size-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t.addFactory}</h2>
                <p className="text-xs text-neutral-500">{t.createFactoryDesc}</p>
              </div>
            </div>
            <form onSubmit={handleAddFactory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.factoryName}</label>
                <input 
                  type="text" 
                  name="factoryName" 
                  required 
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder={t.factoryNamePlaceholder} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">{t.factoryProfile}</label>
                <input 
                  type="text" 
                  name="factoryProfile" 
                  defaultValue="Factory"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder={t.factoryProfilePlaceholder} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddFactoryModalOpen(false)} 
                  className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t.createFactory}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
