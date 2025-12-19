import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectCreateRequest, ProjectUpdateRequest, ProjectsByCustomer } from '../models/project.model';
import { CustomerService } from './customer.service';
import { Customer } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/api/projects`;

  constructor(
    private http: HttpClient,
    private customerService: CustomerService
  ) { }

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  createProject(project: ProjectCreateRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project);
  }

  updateProject(id: string, project: ProjectUpdateRequest): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project);
  }

  deleteProject(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getProjectsByCustomer(): Observable<ProjectsByCustomer[]> {
    return this.getProjects().pipe(
      switchMap(projects => {
        // Get customers from projects
        const customerIds = [...new Set(projects.map(p => p.customerId._id))];
      
        if (customerIds.length === 0) {
          return new Observable<ProjectsByCustomer[]>(subscriber => {
            subscriber.next([]);
            subscriber.complete();
          });
        }

        // Get all customers in one request
        return this.customerService.getCustomers().pipe(
          map(customers => {
            const customerMap = new Map<string, Customer>();
            customers.forEach(customer => customerMap.set(customer._id, customer));

            // Group projects by customer
            const projectsByCustomer: ProjectsByCustomer[] = [];
            
            customerIds.forEach(customerId => {
              const customer = customerMap.get(customerId);
              if (customer) {
                const customerProjects = projects.filter(p => p.customerId._id === customerId);
                projectsByCustomer.push({
                  customer: {
                    _id: customer._id,
                    name: customer.name
                  },
                  projects: customerProjects
                });
              }
            });
            
            return projectsByCustomer;
          })
        );
      })
    );
  }
}