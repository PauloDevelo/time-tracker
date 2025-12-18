<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version change: N/A (initial) -> 1.0.0
  
  Modified principles: N/A (initial creation)
  
  Added sections:
    - Core Principles (6 principles)
    - Technology Stack section
    - Development Workflow section
    - Governance section
  
  Removed sections: N/A (initial creation)
  
  Templates requiring updates:
    - .specify/templates/plan-template.md: N/A (no constitution-specific references)
    - .specify/templates/spec-template.md: N/A (no constitution-specific references)
    - .specify/templates/tasks-template.md: N/A (no constitution-specific references)
    - .specify/templates/agent-file-template.md: N/A (no constitution-specific references)
    - .specify/templates/checklist-template.md: N/A (no constitution-specific references)
  
  Follow-up TODOs: None
  ============================================================================
-->

# Time Tracker Constitution

## Core Principles

### I. Fullstack TypeScript

All application code MUST be written in TypeScript for both frontend and backend components.
This ensures type safety across the entire stack, enables shared type definitions between
client and server, and reduces context-switching overhead for developers.

- Frontend: Angular with strict TypeScript configuration
- Backend: Node.js with Express, compiled from TypeScript
- Shared types SHOULD be defined in a common location when applicable

### II. Component-Based Architecture

The frontend MUST follow Angular's component-based architecture with Material Design components.

- Components MUST be self-contained with clear inputs and outputs
- Shared components MUST reside in `frontend/src/app/shared/`
- Feature components MUST be organized under `frontend/src/app/features/`
- Services MUST handle business logic and API communication

### III. RESTful API Design

The backend MUST expose functionality via RESTful HTTP endpoints.

- All endpoints MUST follow REST conventions (GET, POST, PUT, DELETE)
- Responses MUST use JSON format
- Errors MUST return appropriate HTTP status codes with descriptive messages
- API documentation MUST be maintained via Swagger/OpenAPI at `/api-docs`

### IV. Data Integrity

MongoDB MUST be used as the primary data store with Mongoose for schema validation.

- All models MUST define explicit schemas with validation rules
- Relationships between entities (Customer, Project, Task, TimeEntry) MUST be
  maintained through proper references
- Time entries MUST accurately track start/end times for invoice generation

### V. Authentication & Authorization

All protected routes MUST require valid JWT authentication via Google OAuth 2.0.

- Authentication tokens MUST be validated on every protected request
- User context MUST be available to all authenticated endpoints
- Sensitive operations MUST verify user ownership of resources

### VI. Invoice-Ready Reporting

The reporting system MUST support accurate time aggregation for customer invoicing.

- Reports MUST aggregate time entries by customer, project, and task
- Export functionality MUST support PDF and Excel formats
- Time calculations MUST be precise to support billing accuracy

## Technology Stack

### Frontend
- **Framework**: Angular (latest stable)
- **UI Library**: Angular Material
- **Language**: TypeScript (strict mode)
- **State Management**: Angular services with RxJS
- **Build Tool**: Angular CLI

### Backend
- **Runtime**: Node.js (v18.19+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (v6+) with Mongoose ODM
- **Authentication**: Google OAuth 2.0 with JWT

### Development
- **Package Manager**: npm
- **Code Style**: ESLint + Prettier
- **API Documentation**: Swagger/OpenAPI

## Development Workflow

### Code Organization
- Backend code resides in `backend/src/` with controllers, models, routes, and services
- Frontend code resides in `frontend/src/app/` organized by features
- Configuration MUST use environment variables (never hardcode secrets)

### Testing Strategy
- Unit tests SHOULD cover critical business logic
- Integration tests SHOULD verify API endpoint behavior
- E2E tests MAY be added for critical user journeys

### Code Review Requirements
- All changes MUST be reviewed before merging
- Changes MUST not break existing functionality
- New features MUST include appropriate documentation updates

## Governance

This constitution defines the foundational rules for the Time Tracker application.
All development decisions MUST align with these principles.

### Amendment Process
1. Proposed amendments MUST be documented with rationale
2. Amendments MUST be reviewed for impact on existing code
3. Version MUST be incremented according to semantic versioning:
   - MAJOR: Backward-incompatible principle changes
   - MINOR: New principles or significant expansions
   - PATCH: Clarifications and non-semantic refinements

### Compliance
- All PRs MUST verify compliance with these principles
- Deviations MUST be explicitly justified and documented
- The plan-template.md Constitution Check section MUST validate against these principles

**Version**: 1.0.0 | **Ratified**: 2025-12-18 | **Last Amended**: 2025-12-18
