
export type VehicleType = 'Car' | 'Truck' | 'Bus' | 'Equipment';
export type PartCategory = 'Engine' | 'Electrical' | 'Body' | 'Tyre' | 'Other';

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  chassisNumber?: string;
  photo?: string; // Base64 or URL
  updatedAt: string;
}

export interface Part {
  id: string;
  vehicleId: string;
  itemNumber: string;
  thirdItemNumber: string;
  itemDescription: string;
  descriptionLine2: string;
  quantity: number;
  supplierName: string;
  installedDate: string;
  category: PartCategory;
}

export interface AppState {
  vehicles: Vehicle[];
  parts: Part[];
}
