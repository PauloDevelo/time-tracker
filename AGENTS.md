# Agent Guidelines

## Build/Test Commands
**Backend** (Express/TypeScript/MongoDB):
- Build: `cd backend && npm run build`
- Test: `cd backend && npm test` (Jest)
- Single test: `cd backend && npm test -- <test-file>`
- Dev: `cd backend && npm run dev` (nodemon on port 3000)

**Frontend** (Angular 19/Material):
- Build: `cd frontend && npm run build`
- Test: `cd frontend && npm test` (Jasmine/Karma)
- Single test: `cd frontend && npm test -- --include='**/path/to/spec.ts'`
- Dev: `cd frontend && npm start` (ng serve on port 4200)

## Code Style
- **Indentation**: 2 spaces (enforced by .editorconfig)
- **Quotes**: Single quotes for TypeScript
- **Types**: Strict mode enabled - all functions/vars typed, no implicit any, strict null checks
- **Imports**: Order: external libs → Angular modules → local services/models; use named imports
- **Naming**: camelCase (vars/functions), PascalCase (classes/interfaces/components), prefix backend interfaces with `I` (e.g., `IUser`)
- **Error Handling**: Backend - try-catch with proper HTTP codes (401/404/500); Frontend - RxJS catchError + throwError
- **Models**: Backend - export interface extending Document + Mongoose model with Schema<T>; Frontend - plain interfaces
- **Components**: Standalone components with explicit imports (CommonModule, ReactiveFormsModule, Material, Services order)
- **Services**: Use `@Injectable({providedIn: 'root'})` for singletons; return Observables with error handling
- **Returns**: Explicit return with types; early return for error conditions
- **Async**: Backend - async/await in controllers; Frontend - RxJS Observables with pipe operators (tap, catchError)
