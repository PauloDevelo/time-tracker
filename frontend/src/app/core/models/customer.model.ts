export interface Customer {
  _id: string;
  name: string;
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  billingDetails: {
    dailyRate: number;
    currency: string;
    paymentTerms?: string;
  };
  azureDevOps?: {
    organizationUrl: string;
    pat: string;
    enabled: boolean;
  };
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateRequest {
  name: string;
  contactInfo: {
    email: string;
    phone?: string;
    address?: string;
  };
  billingDetails: {
    dailyRate: number;
    currency: string;
    paymentTerms?: string;
  };
  azureDevOps?: {
    organizationUrl: string;
    pat: string;
    enabled: boolean;
  };
}

export interface CustomerUpdateRequest extends CustomerCreateRequest {
  _id: string;
} 