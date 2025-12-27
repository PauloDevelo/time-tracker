import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ContractService } from './contract.service';
import { Contract, ContractCreateRequest, ContractUpdateRequest } from '../models/contract.model';
import { environment } from '../../../environments/environment';

describe('ContractService', () => {
  let service: ContractService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/customers`;

  const mockContract: Contract = {
    _id: 'contract123',
    customerId: 'customer123',
    name: 'Test Contract 2025',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.000Z',
    dailyRate: 500,
    currency: 'EUR',
    daysToCompletion: 220,
    userId: 'user123',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };

  const mockContract2: Contract = {
    _id: 'contract456',
    customerId: 'customer123',
    name: 'Test Contract 2024',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-12-31T23:59:59.000Z',
    dailyRate: 450,
    currency: 'EUR',
    daysToCompletion: 200,
    userId: 'user123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContractService]
    });
    service = TestBed.inject(ContractService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // 1. Service Setup
  describe('Service Setup', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  // 2. getContractsByCustomer Tests
  describe('getContractsByCustomer', () => {
    const customerId = 'customer123';

    it('should call GET /api/customers/:customerId/contracts', () => {
      service.getContractsByCustomer(customerId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should return array of contracts', () => {
      const mockContracts: Contract[] = [mockContract, mockContract2];

      service.getContractsByCustomer(customerId).subscribe(contracts => {
        expect(contracts).toEqual(mockContracts);
        expect(contracts.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      req.flush(mockContracts);
    });

    it('should return empty array when no contracts', () => {
      service.getContractsByCustomer(customerId).subscribe(contracts => {
        expect(contracts).toEqual([]);
        expect(contracts.length).toBe(0);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      req.flush([]);
    });

    it('should handle HTTP error', () => {
      const errorMessage = 'Server error';

      service.getContractsByCustomer(customerId).subscribe({
        next: () => fail('should have failed with HTTP error'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // 3. getContract Tests
  describe('getContract', () => {
    const customerId = 'customer123';
    const contractId = 'contract123';

    it('should call GET /api/customers/:customerId/contracts/:contractId', () => {
      service.getContract(customerId, contractId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockContract);
    });

    it('should return single contract', () => {
      service.getContract(customerId, contractId).subscribe(contract => {
        expect(contract).toEqual(mockContract);
        expect(contract._id).toBe(contractId);
        expect(contract.name).toBe('Test Contract 2025');
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      req.flush(mockContract);
    });

    it('should handle 404 error', () => {
      const errorMessage = 'Contract not found';

      service.getContract(customerId, 'nonexistent').subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/nonexistent`);
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });

  // 4. createContract Tests
  describe('createContract', () => {
    const customerId = 'customer123';
    const createRequest: ContractCreateRequest = {
      name: 'New Contract 2025',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-12-31T23:59:59.000Z',
      dailyRate: 600,
      currency: 'EUR',
      daysToCompletion: 250,
      description: 'New contract description'
    };

    it('should call POST /api/customers/:customerId/contracts', () => {
      service.createContract(customerId, createRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      expect(req.request.method).toBe('POST');
      req.flush(mockContract);
    });

    it('should send contract data in request body', () => {
      service.createContract(customerId, createRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      expect(req.request.body).toEqual(createRequest);
      req.flush(mockContract);
    });

    it('should return created contract', () => {
      const createdContract: Contract = {
        ...mockContract,
        _id: 'newContract123',
        name: createRequest.name,
        dailyRate: createRequest.dailyRate,
        daysToCompletion: createRequest.daysToCompletion,
        description: createRequest.description
      };

      service.createContract(customerId, createRequest).subscribe(contract => {
        expect(contract).toEqual(createdContract);
        expect(contract.name).toBe(createRequest.name);
        expect(contract.dailyRate).toBe(createRequest.dailyRate);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      req.flush(createdContract);
    });

    it('should handle validation error', () => {
      const errorResponse = { message: 'Validation failed: name is required' };

      service.createContract(customerId, { ...createRequest, name: '' }).subscribe({
        next: () => fail('should have failed with validation error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });

  // 5. updateContract Tests
  describe('updateContract', () => {
    const customerId = 'customer123';
    const contractId = 'contract123';
    const updateRequest: ContractUpdateRequest = {
      _id: contractId,
      name: 'Updated Contract 2025',
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-12-31T23:59:59.000Z',
      dailyRate: 550,
      currency: 'EUR',
      daysToCompletion: 230,
      description: 'Updated description'
    };

    it('should call PUT /api/customers/:customerId/contracts/:contractId', () => {
      service.updateContract(customerId, contractId, updateRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockContract);
    });

    it('should send updated data in request body', () => {
      service.updateContract(customerId, contractId, updateRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      expect(req.request.body).toEqual(updateRequest);
      req.flush(mockContract);
    });

    it('should return updated contract', () => {
      const updatedContract: Contract = {
        ...mockContract,
        name: updateRequest.name,
        dailyRate: updateRequest.dailyRate,
        daysToCompletion: updateRequest.daysToCompletion,
        description: updateRequest.description,
        updatedAt: '2025-06-15T10:00:00.000Z'
      };

      service.updateContract(customerId, contractId, updateRequest).subscribe(contract => {
        expect(contract).toEqual(updatedContract);
        expect(contract.name).toBe(updateRequest.name);
        expect(contract.dailyRate).toBe(updateRequest.dailyRate);
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      req.flush(updatedContract);
    });

    it('should handle 404 error', () => {
      const errorMessage = 'Contract not found';

      service.updateContract(customerId, 'nonexistent', updateRequest).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe('Not Found');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/nonexistent`);
      req.flush(errorMessage, { status: 404, statusText: 'Not Found' });
    });
  });

  // 6. deleteContract Tests
  describe('deleteContract', () => {
    const customerId = 'customer123';
    const contractId = 'contract123';

    it('should call DELETE /api/customers/:customerId/contracts/:contractId', () => {
      service.deleteContract(customerId, contractId).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Contract deleted successfully' });
    });

    it('should return success message', () => {
      const successResponse = { message: 'Contract deleted successfully' };

      service.deleteContract(customerId, contractId).subscribe(response => {
        expect(response).toEqual(successResponse);
        expect(response.message).toBe('Contract deleted successfully');
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      req.flush(successResponse);
    });

    it('should handle error when contract in use', () => {
      const errorResponse = { message: 'Cannot delete contract: it is referenced by existing time entries' };

      service.deleteContract(customerId, contractId).subscribe({
        next: () => fail('should have failed with conflict error'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.statusText).toBe('Conflict');
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${customerId}/contracts/${contractId}`);
      req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
    });
  });
});
