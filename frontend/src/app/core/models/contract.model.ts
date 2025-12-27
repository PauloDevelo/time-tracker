export interface Contract {
  _id: string;
  customerId: string;
  name: string;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractCreateRequest {
  name: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  currency: string;
  daysToCompletion: number;
  description?: string;
}

export interface ContractUpdateRequest extends ContractCreateRequest {
  _id: string;
}

// For displaying in dropdowns/lists
export interface ContractSummary {
  _id: string;
  name: string;
  dailyRate: number;
  currency: string;
  startDate: string;
  endDate: string;
}
