import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  SignupRequest 
} from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenExpirationTimer: any;

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService,
    private router: Router
  ) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const token = localStorage.getItem('access_token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.http.get<User>(`${this.apiUrl}/me`)
        .pipe(
          catchError(() => {
            this.logout();
            return throwError(() => new Error('Error getting current user'));
          })
        )
        .subscribe(user => {
          this.currentUserSubject.next(user);
          this.setTokenExpirationTimer(token);
        });
    }
  }

  signup(signupData: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, signupData)
      .pipe(
        catchError(error => {
          return throwError(() => new Error(error.error?.error || 'Failed to sign up'));
        }),
        tap(response => this.handleAuthentication(response))
      );
  }

  login(loginData: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginData)
      .pipe(
        catchError(error => {
          return throwError(() => new Error(error.error?.error || 'Failed to login'));
        }),
        tap(response => this.handleAuthentication(response))
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.currentUserSubject.next(null);
    this.clearTokenExpirationTimer();
    
    // Call API to logout
    this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        catchError(() => {
          return throwError(() => new Error('Error during logout'));
        })
      )
      .subscribe();
      
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token && !this.jwtHelper.isTokenExpired(token);
  }

  private handleAuthentication(response: AuthResponse): void {
    localStorage.setItem('access_token', response.token);
    this.currentUserSubject.next(response.user);
    this.setTokenExpirationTimer(response.token);
  }

  private setTokenExpirationTimer(token: string): void {
    this.clearTokenExpirationTimer();
    
    const expirationDate = this.jwtHelper.getTokenExpirationDate(token);
    if (expirationDate) {
      const timeout = expirationDate.getTime() - new Date().getTime();
      this.tokenExpirationTimer = setTimeout(() => {
        this.logout();
      }, timeout);
    }
  }

  private clearTokenExpirationTimer(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
  }
} 