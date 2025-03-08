import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { JwtModule } from '@auth0/angular-jwt';
import { CommonModule } from '@angular/common'; // Import CommonModule

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export function tokenGetter() {
  return localStorage.getItem('access_token');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      JwtModule.forRoot({
        config: {
          tokenGetter: tokenGetter,
          allowedDomains: ['localhost:3000'],
          disallowedRoutes: ['localhost:3000/auth/login', 'localhost:3000/auth/signup'],
        },
      })
    ),
    { provide: CommonModule, useValue: CommonModule },
  ]
};
