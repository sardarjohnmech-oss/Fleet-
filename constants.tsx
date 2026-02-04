
import React from 'react';
import { Truck, Car, Bus, Wrench, LayoutDashboard, Search, Database, List } from 'lucide-react';
import { VehicleType, PartCategory } from './types';

export const VEHICLE_TYPES: VehicleType[] = ['Car', 'Truck', 'Bus', 'Equipment'];
export const PART_CATEGORIES: PartCategory[] = ['Engine', 'Electrical', 'Body', 'Tyre', 'Other'];

export const NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'search', label: 'Quick Search', icon: <Search className="w-5 h-5" /> },
  { id: 'vehicles', label: 'Vehicle Master', icon: <Database className="w-5 h-5" /> },
  { id: 'parts', label: 'Vehicle Parts', icon: <Wrench className="w-5 h-5" /> },
];

export const INITIAL_VEHICLES = [
  { id: 'v1', vehicleNumber: 'KA-01-ME-1234', type: 'Truck' as const, brand: 'Tata', model: 'Prima', year: 2022, updatedAt: new Date().toISOString() },
  { id: 'v2', vehicleNumber: 'MH-12-RS-5678', type: 'Bus' as const, brand: 'Volvo', model: '9400', year: 2021, updatedAt: new Date().toISOString() },
];

export const INITIAL_PARTS = [
  { 
    id: 'p1', 
    vehicleId: 'v1', 
    itemNumber: '8081010228', 
    thirdItemNumber: '8081010228', 
    itemDescription: 'VEHICLE/PLANT/EQUIPMENT', 
    descriptionLine2: 'SERVICE STICKERS', 
    quantity: 1, 
    supplierName: 'AutoHub', 
    installedDate: '2023-12-01', 
    category: 'Other' as const 
  },
  { 
    id: 'p2', 
    vehicleId: 'v2', 
    itemNumber: '3215060003', 
    thirdItemNumber: 'LF3874/LF3335', 
    itemDescription: 'OIL FILTER', 
    descriptionLine2: '16.5 KVA', 
    quantity: 1, 
    supplierName: 'SafeDrive', 
    installedDate: '2024-01-15', 
    category: 'Engine' as const 
  },
];
