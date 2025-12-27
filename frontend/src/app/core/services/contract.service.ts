import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contract, ContractCreateRequest, ContractUpdateRequest } from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = `${environment.apiUrl}/api/customers`;

  constructor(private http: HttpClient) { }

  // Get all contracts for a customer
  getContractsByCustomer(customerId: string): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/${customerId}/contracts`);
  }

  // Get a single contract
  getContract(customerId: string, contractId: string): Observable<Contract> {
    return this.http.get<Contract>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`
    );
  }

  // Create a new contract
  createContract(customerId: string, contract: ContractCreateRequest): Observable<Contract> {
    return this.http.post<Contract>(
      `${this.apiUrl}/${customerId}/contracts`,
      contract
    );
  }

  // Update a contract
  updateContract(
    customerId: string,
    contractId: string,
    contract: ContractUpdateRequest
  ): Observable<Contract> {
    return this.http.put<Contract>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`,
      contract
    );
  }

  // Delete a contract
  deleteContract(customerId: string, contractId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${customerId}/contracts/${contractId}`
    );
  }
}
