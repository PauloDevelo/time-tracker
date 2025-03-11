import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task, TaskCreateRequest, TaskUpdateRequest, TaskWithProjectName, TasksByProject } from '../models/task.model';
import { ProjectService } from './project.service';
import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/api/tasks`;

  constructor(
    private http: HttpClient,
    private projectService: ProjectService
  ) { }
  getTasks(): Observable<Task[]> {
    return this.http.get<{ tasks: Task[] }>(`${this.apiUrl}?limit=10000`).pipe(map(resp => resp.tasks));
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  createTask(task: TaskCreateRequest): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task);
  }

  updateTask(id: string, task: TaskUpdateRequest): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, task);
  }

  deleteTask(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getTasksByProject(projectId: string): Observable<Task[]> {
    // Using the query parameter to filter tasks by project
    return this.http.get<{ tasks: Task[] }>(`${this.apiUrl}?projectId=${projectId}&limit=10000`).pipe(map(resp => resp.tasks));
  }

  getTasksByAllProjects(): Observable<TasksByProject[]> {
    return forkJoin(
    {
      tasks: this.getTasks(),
      projects: this.projectService.getProjects()
    })
    .pipe(map(({ tasks, projects }) => {
        const projectMap = new Map<string, Project>();
        projects.forEach(project => projectMap.set(project._id, project));
        const projectIds = [...new Set(tasks.map(t => t.projectId))];
        const tasksByProject: TasksByProject[] = [];
        projectIds.forEach(projectId => {
          const project = projectMap.get(projectId);
          if (project) {
            const projectTasks = tasks.filter(t => t.projectId === projectId);
            tasksByProject.push({
              project: {
                _id: project._id,
                name: project.name
              },
              tasks: projectTasks
            });
          }
        });
        return tasksByProject;
      }));
  }

  getTasksWithProjectName(): Observable<TaskWithProjectName[]> {
    const tasksByProject$ = this.getTasksByAllProjects();
    return tasksByProject$.pipe(
      map(tasksByProject => {
        const tasksWithProjectName: TaskWithProjectName[] = [];
        
        tasksByProject.forEach(project => {
          project.tasks.forEach(task => {
            tasksWithProjectName.push({
              ...task,
              projectName: project.project.name
            });
          });
        });
        
        return tasksWithProjectName;
      })
    );
  }
} 