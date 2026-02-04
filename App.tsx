
import React, { useState, useEffect, useMemo, FC, ReactNode, FormEvent, useRef } from 'react';
import { 
  Menu, X, Plus, Trash2, Edit2, Search, ArrowRight, 
  BarChart3, Package, Truck, Info, Wrench, Camera, Image as ImageIcon,
  ChevronDown, ShieldCheck, Lock, Eye
} from 'lucide-react';
import { Vehicle, Part, AppState, VehicleType, PartCategory } from './types';
import { getStoredData, saveStoredData } from './store';
import { NAVIGATION, VEHICLE_TYPES, PART_CATEGORIES } from './constants';
import { getPartMaintenanceAdvice } from './services/geminiService';

// --- Stylized Logo Component ---
const STSLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl"
  };
  
  return (
    <div className={`font-black tracking-tighter text-emerald-600 italic select-none flex items-center ${sizeClasses[size]}`} style={{ 
      textShadow: '2px 2px 0px #064e3b, 4px 4px 0px rgba(0,0,0,0.1)',
      WebkitTextStroke: '1px #064e3b'
    }}>
      STS
    </div>
  );
};

// --- Sub-components ---

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
}

const StatsCard: FC<StatsCardProps> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-4 rounded-xl ${color} text-white`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold">{value}</h3>
    </div>
  </div>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const VehicleAvatar = ({ vehicle, size = "md" }: { vehicle: Vehicle, size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 text-2xl"
  };

  if (vehicle.photo) {
    return (
      <img 
        src={vehicle.photo} 
        alt={vehicle.vehicleNumber} 
        className={`${sizeClasses[size]} rounded-xl object-cover border border-slate-200 shadow-sm`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200`}>
      <Truck className={size === "sm" ? "w-4 h-4" : size === "xl" ? "w-10 h-10" : "w-6 h-6"} />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>(getStoredData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  // ROLES: In a real app, this would come from an auth context or Google Drive API.
  // We'll toggle it manually for demonstration.
  const [isEditorMode, setIsEditorMode] = useState(false); // Default to Technician (Viewer) Mode
  
  // Form States
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  
  // Photo Upload State
  const [tempPhoto, setTempPhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveStoredData(state);
  }, [state]);

  const stats = useMemo(() => ({
    totalVehicles: state.vehicles.length,
    totalParts: state.parts.length,
    recentVehicles: [...state.vehicles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3)
  }), [state]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVehicle = (e: FormEvent<HTMLFormElement>) => {
    if (!isEditorMode) return;
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newVehicle: Vehicle = {
      id: editingVehicle?.id || Math.random().toString(36).substr(2, 9),
      vehicleNumber: formData.get('vehicleNumber') as string,
      type: formData.get('type') as VehicleType,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: parseInt(formData.get('year') as string),
      chassisNumber: formData.get('chassisNumber') as string,
      photo: tempPhoto,
      updatedAt: new Date().toISOString(),
    };

    if (editingVehicle) {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.map(v => v.id === editingVehicle.id ? newVehicle : v)
      }));
    } else {
      setState(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
    }
    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
    setTempPhoto(undefined);
  };

  const handleAddPart = (e: FormEvent<HTMLFormElement>) => {
    if (!isEditorMode) return;
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPart: Part = {
      id: editingPart?.id || Math.random().toString(36).substr(2, 9),
      vehicleId: selectedVehicleId || '',
      itemNumber: formData.get('itemNumber') as string,
      thirdItemNumber: formData.get('thirdItemNumber') as string,
      itemDescription: formData.get('itemDescription') as string,
      descriptionLine2: formData.get('descriptionLine2') as string,
      quantity: parseInt(formData.get('quantity') as string),
      supplierName: formData.get('supplierName') as string,
      installedDate: formData.get('installedDate') as string,
      category: formData.get('category') as PartCategory,
    };

    if (editingPart) {
      setState(prev => ({
        ...prev,
        parts: prev.parts.map(p => p.id === editingPart.id ? newPart : p)
      }));
    } else {
      setState(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
    }
    setIsPartModalOpen(false);
    setEditingPart(null);
  };

  const deleteVehicle = (id: string) => {
    if (!isEditorMode) return;
    if (confirm('Delete this vehicle and all its parts data?')) {
      setState(prev => ({
        vehicles: prev.vehicles.filter(v => v.id !== id),
        parts: prev.parts.filter(p => p.vehicleId !== id)
      }));
    }
  };

  const deletePart = (id: string) => {
    if (!isEditorMode) return;
    if (confirm('Delete this part record?')) {
      setState(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
    }
  };

  // --- Render Sections ---

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard title="Total Vehicles" value={stats.totalVehicles} icon={<Truck className="w-6 h-6" />} color="bg-blue-600" />
        <StatsCard title="Total Parts" value={stats.totalParts} icon={<Package className="w-6 h-6" />} color="bg-emerald-600" />
        <StatsCard title="Recent Updates" value={stats.recentVehicles.length} icon={<BarChart3 className="w-6 h-6" />} color="bg-orange-500" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Recently Updated Vehicles</h3>
          <button onClick={() => setActiveTab('vehicles')} className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Vehicle</th>
                <th className="px-6 py-4 font-semibold">Model</th>
                <th className="px-6 py-4 font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentVehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedVehicleId(v.id); setActiveTab('search'); }}>
                  <td className="px-6 py-4 flex items-center gap-4">
                    <VehicleAvatar vehicle={v} size="sm" />
                    <span className="font-bold text-slate-700">{v.vehicleNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{v.brand} {v.model}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{new Date(v.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderVehicleMaster = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Vehicle Master</h2>
        {isEditorMode && (
          <button 
            onClick={() => { setEditingVehicle(null); setTempPhoto(undefined); setIsVehicleModalOpen(true); }}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Add New Vehicle
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Reg. Number</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Model</th>
                <th className="px-6 py-4 font-semibold">Year</th>
                {isEditorMode && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <VehicleAvatar vehicle={v} size="md" />
                    <span className="font-bold text-slate-900">{v.vehicleNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-xs font-bold uppercase">{v.type}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{v.brand} {v.model}</td>
                  <td className="px-6 py-4 text-slate-500">{v.year}</td>
                  {isEditorMode && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingVehicle(v); setTempPhoto(v.photo); setIsVehicleModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteVehicle(v.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderVehicleParts = () => {
    const selectedVehicle = state.vehicles.find(v => v.id === selectedVehicleId);
    const vehicleParts = state.parts.filter(p => p.vehicleId === selectedVehicleId);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full md:w-1/3">
              <h3 className="font-bold text-slate-800 mb-2">Select Vehicle</h3>
              <select 
                value={selectedVehicleId || ''} 
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="">Choose a vehicle...</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} - {v.model}</option>
                ))}
              </select>
            </div>
            {selectedVehicleId && isEditorMode && (
              <button 
                onClick={() => { setEditingPart(null); setIsPartModalOpen(true); }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                <Plus className="w-5 h-5" /> Add New Part
              </button>
            )}
          </div>

          {selectedVehicleId ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FFBF00] text-black uppercase font-bold">
                  <tr>
                    <th className="px-3 py-4 border border-slate-300">Sl.No</th>
                    <th className="px-3 py-4 border border-slate-300">Item Number</th>
                    <th className="px-3 py-4 border border-slate-300">3rd Item Number</th>
                    <th className="px-3 py-4 border border-slate-300">Item Description</th>
                    <th className="px-3 py-4 border border-slate-300">Description Line 2</th>
                    <th className="px-3 py-4 border border-slate-300">Trans Quantity</th>
                    <th className="px-3 py-4 border border-slate-300">Supplier Name</th>
                    {isEditorMode && <th className="px-3 py-4 border border-slate-300 bg-emerald-50 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-[#FEF9E7]">
                  {vehicleParts.map((p, index) => (
                    <tr key={p.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-3 py-3 border border-slate-200 text-center font-medium">{index + 1}</td>
                      <td className="px-3 py-3 border border-slate-200 font-medium">{p.itemNumber}</td>
                      <td className="px-3 py-3 border border-slate-200 text-slate-600">{p.thirdItemNumber}</td>
                      <td className="px-3 py-3 border border-slate-200 font-bold text-slate-800 uppercase">{p.itemDescription}</td>
                      <td className="px-3 py-3 border border-slate-200 text-slate-700 uppercase">{p.descriptionLine2}</td>
                      <td className="px-3 py-3 border border-slate-200 text-center font-bold">{p.quantity}</td>
                      <td className="px-3 py-3 border border-slate-200 text-slate-600">{p.supplierName}</td>
                      {isEditorMode && (
                        <td className="px-3 py-3 border border-slate-200 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingPart(p); setIsPartModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deletePart(p.id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {vehicleParts.length === 0 && (
                    <tr>
                      <td colSpan={isEditorMode ? 8 : 7} className="py-20 text-center text-slate-400 bg-white">
                        <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        No parts records available for this vehicle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200">
              <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">Select a vehicle to view its maintenance history.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTechnicianSearch = () => {
    const searchResults = state.vehicles.filter(v => 
      v.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedQuickVehicle = state.vehicles.find(v => v.id === selectedVehicleId);
    const quickParts = state.parts.filter(p => p.vehicleId === selectedVehicleId);

    return (
      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-6 h-6" />
          <input 
            type="text" 
            placeholder="Search by Vehicle Number or Model..." 
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-emerald-100 transition-all text-xl font-bold placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {!selectedVehicleId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchQuery && searchResults.map(v => (
              <button 
                key={v.id} 
                onClick={() => setSelectedVehicleId(v.id)}
                className="bg-white p-4 rounded-2xl border border-slate-200 text-left hover:border-emerald-500 hover:shadow-lg transition-all flex items-center gap-4 group"
              >
                <VehicleAvatar vehicle={v} size="md" />
                <div className="flex-1">
                  <h4 className="text-xl font-black text-slate-800">{v.vehicleNumber}</h4>
                  <p className="text-slate-500 text-sm font-medium">{v.brand} {v.model}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <p className="col-span-full text-center text-slate-400 font-medium py-10">No matching vehicles found.</p>
            )}
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-300 pb-20">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelectedVehicleId(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight">FLEET PARTS MASTER</h2>
            </div>
            
            <div className="flex flex-col gap-8">
              {/* Header section with Yellow Card and Large Photo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Yellow Vehicle Info Card - RESTORED: #FFBF00 with Black Text */}
                <div className="bg-[#FFBF00] text-black p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden min-h-[320px] flex flex-col justify-between">
                   <div className="relative z-10 space-y-6">
                      <div className="bg-black/10 w-fit px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-black/70 border border-black/10">
                        {selectedQuickVehicle?.type || 'UNIT'}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-6xl font-black tracking-tight leading-none uppercase">
                          {selectedQuickVehicle?.vehicleNumber}
                        </h3>
                        <p className="text-2xl text-black/70 font-bold uppercase tracking-tight">
                          {selectedQuickVehicle?.brand} {selectedQuickVehicle?.model}
                        </p>
                      </div>
                      <div className="pt-8 border-t border-black/10 mt-4 flex justify-between items-end">
                        <div>
                          <p className="text-[10px] opacity-60 font-mono tracking-widest uppercase mb-1">Chassis / VIN</p>
                          <p className="text-sm font-mono tracking-widest font-bold">
                            {selectedQuickVehicle?.chassisNumber || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] opacity-60 font-mono tracking-widest uppercase mb-1">Mfg Year</p>
                          <p className="text-sm font-mono tracking-widest font-bold">
                            {selectedQuickVehicle?.year}
                          </p>
                        </div>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                </div>

                {/* Large Vehicle Photograph Area - RESTORED: Scale 105, No Shadow */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 flex items-center justify-center p-2 min-h-[320px] overflow-hidden">
                    {selectedQuickVehicle?.photo ? (
                        <img 
                          src={selectedQuickVehicle.photo} 
                          className="w-full h-full object-contain max-h-[320px] scale-105 transition-transform" 
                          alt="Vehicle Asset" 
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-100">
                          <ImageIcon className="w-40 h-40" />
                        </div>
                    )}
                </div>
              </div>

              {/* RESTORED: Table with Yellow Header */}
              <div className="space-y-4 w-full">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px] md:text-xs border-collapse">
                      <thead className="bg-[#FFBF00] text-black uppercase font-bold">
                        <tr>
                          <th className="px-3 py-3 border border-slate-300 w-16 text-center">Sl.No</th>
                          <th className="px-3 py-3 border border-slate-300">Item Number</th>
                          <th className="px-3 py-3 border border-slate-300">3rd Item Number</th>
                          <th className="px-3 py-3 border border-slate-300 min-w-[180px]">Item Description</th>
                          <th className="px-3 py-3 border border-slate-300 min-w-[180px]">Description Line 2</th>
                          <th className="px-3 py-3 border border-slate-300 w-28 text-center">Trans Quantity</th>
                          <th className="px-3 py-3 border border-slate-300">Supplier Name</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {quickParts.length > 0 ? quickParts.map((p, index) => (
                          <tr key={p.id} className="border-b border-dashed border-slate-200 hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-center font-medium">{index + 1}</td>
                            <td className="px-3 py-2 font-medium">{p.itemNumber}</td>
                            <td className="px-3 py-2 text-slate-500">{p.thirdItemNumber}</td>
                            <td className="px-3 py-2 font-bold text-slate-800 uppercase">{p.itemDescription}</td>
                            <td className="px-3 py-2 text-slate-600 uppercase">{p.descriptionLine2}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">{p.quantity}</td>
                            <td className="px-3 py-2 text-slate-600">{p.supplierName}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="py-20 text-center text-slate-300 italic">
                              No maintenance records found for this unit.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <header className="md:hidden bg-[#0b101f] text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-lg">
        <h1 className="text-xl font-black tracking-tighter flex items-center gap-3">
          <STSLogo size="sm" />
          <div className="flex flex-col">
             <span className="text-xs font-black tracking-widest text-emerald-400">STS</span>
             <span className="text-[10px] opacity-60 uppercase font-bold">Special Technical Service</span>
          </div>
        </h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0b101f] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden md:block border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <STSLogo size="lg" />
          </div>
          <h1 className="text-xs font-black tracking-[0.2em] text-emerald-500 uppercase">Special Technical Service</h1>
          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Fleet Systems</p>
        </div>

        <nav className="px-4 mt-8 md:mt-4 space-y-2">
          {NAVIGATION.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); if (item.id !== 'parts') setSelectedVehicleId(null); }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-8 right-8 space-y-4">
          {/* Permission Toggle for Demo - In real app, this is determined by auth */}
          <button 
            onClick={() => setIsEditorMode(!isEditorMode)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isEditorMode ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' : 'bg-emerald-600/10 border-emerald-600/20 text-emerald-400'}`}
          >
            <div className="flex items-center gap-3">
              {isEditorMode ? <ShieldCheck className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span className="text-xs font-bold uppercase tracking-tight">{isEditorMode ? 'Admin Mode' : 'Technician Mode'}</span>
            </div>
            {isEditorMode ? <Edit2 className="w-4 h-4 opacity-50" /> : <Lock className="w-4 h-4 opacity-50" />}
          </button>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Cloud Drive Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-bold text-slate-300">Shared Storage Active</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 lg:p-14 overflow-y-auto">
        {/* Permission Notification */}
        {!isEditorMode && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 animate-in slide-in-from-top-2 duration-300">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-bold uppercase tracking-tight">Technician View Only</p>
              <p className="text-xs opacity-80 font-medium">Editing is restricted. All data is synchronized from the shared Fleet Drive.</p>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto pb-24 md:pb-0">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'vehicles' && renderVehicleMaster()}
          {activeTab === 'parts' && renderVehicleParts()}
          {activeTab === 'search' && renderTechnicianSearch()}
        </div>
      </main>

      {/* Vehicle Modal - Only for Admin */}
      {isEditorMode && (
        <Modal 
          isOpen={isVehicleModalOpen} 
          onClose={() => setIsVehicleModalOpen(false)} 
          title={editingVehicle ? "Edit Unit Master" : "New Unit Master"}
        >
          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">Unit Photograph</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                  {tempPhoto ? (
                    <img src={tempPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 mb-2 leading-tight">Attach a professional reference image of the unit.</p>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Select Asset File
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Unit Identification Number *</label>
              <input name="vehicleNumber" defaultValue={editingVehicle?.vehicleNumber} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Unit Category</label>
                <select name="type" defaultValue={editingVehicle?.type} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Mfg Year</label>
                <input name="year" type="number" defaultValue={editingVehicle?.year || 2024} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Make / Brand</label>
                <input name="brand" defaultValue={editingVehicle?.brand} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Model Specification</label>
                <input name="model" defaultValue={editingVehicle?.model} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">VIN / Chassis Number</label>
              <input name="chassisNumber" defaultValue={editingVehicle?.chassisNumber} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
              {editingVehicle ? "Update Asset Record" : "Save Asset Record"}
            </button>
          </form>
        </Modal>
      )}

      {/* Part Modal - Only for Admin */}
      {isEditorMode && (
        <Modal 
          isOpen={isPartModalOpen} 
          onClose={() => setIsPartModalOpen(false)} 
          title={editingPart ? "Modify Inventory Entry" : "Create Inventory Entry"}
        >
          <form onSubmit={handleAddPart} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Item Number *</label>
                <input name="itemNumber" defaultValue={editingPart?.itemNumber} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">3rd Item Number</label>
                <input name="thirdItemNumber" defaultValue={editingPart?.thirdItemNumber} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Item Description *</label>
              <input name="itemDescription" defaultValue={editingPart?.itemDescription} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">Description Line 2</label>
              <input name="descriptionLine2" defaultValue={editingPart?.descriptionLine2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Trans Quantity</label>
                <input name="quantity" type="number" defaultValue={editingPart?.quantity || 1} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Trans Category</label>
                <select name="category" defaultValue={editingPart?.category} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold">
                  {PART_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Supplier Name</label>
                <input name="supplierName" defaultValue={editingPart?.supplierName} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase">Entry Date</label>
                <input name="installedDate" type="date" defaultValue={editingPart?.installedDate || new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#0b101f] text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition-colors shadow-xl">
              {editingPart ? "Commit Changes" : "Create Transaction"}
            </button>
          </form>
        </Modal>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40">
        {NAVIGATION.map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); if (item.id !== 'parts') setSelectedVehicleId(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            {item.icon}
            <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
