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
}

export interface CustomerUpdateRequest extends CustomerCreateRequest {
  _id: string;
} 