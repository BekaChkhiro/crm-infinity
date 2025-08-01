# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript task/project management application built with Vite, using Supabase as the backend and shadcn/ui for the component library. The application features authentication, team collaboration, kanban boards, and task management.

## Development Commands

```bash
# Install dependencies (use bun or npm)
bun install
npm install

# Start development server
bun run dev
npm run dev

# Build for production
bun run build
npm run build

# Preview production build
bun run preview
npm run preview

# Run linting
bun run lint
npm run lint

# Build for Render deployment
bun run build:render
npm run build:render
```

## Architecture Overview

### State Management
The application uses React Context API exclusively:
- **AuthContext** (`/src/contexts/AuthContext.tsx`): Manages authentication state, user sessions, and provides auth operations
- **ProfileContext** (`/src/contexts/ProfileContext.tsx`): Manages user profile data and updates
- **GlobalTaskEditContext** (`/src/contexts/GlobalTaskEditContext.tsx`): Manages global task editing state with keyboard shortcut support

### Routing Structure
Using React Router v6 with three types of routes:
- **Public routes**: Accessible without authentication
- **Protected routes**: Wrapped with `ProtectedRoute` component
- **Admin routes**: Wrapped with `AdminRoute` component for role-based access

### Component Architecture
- **UI Components** (`/src/components/ui/`): Complete shadcn/ui component library
- **Feature Components** (`/src/components/`): Domain-specific components like KanbanBoard, TaskCard
- **Page Components** (`/src/pages/`): Route-specific page components
- **Layout Components** (`/src/layouts/`): Reusable layout wrappers

### Database Schema (Supabase)
Key tables:
- `profiles`: User profiles with role management
- `projects`: Project data with owner relationships
- `tasks`: Task data with status, priority, assignee
- `project_members`: Many-to-many relationship for team members
- `kanban_columns`: Kanban board columns with positions
- `task_comments`: Comments with mention support
- `notifications`: User notifications
- `project_activity`: Activity tracking

All tables have Row Level Security policies implemented.

### Key Features Implementation

**Authentication Flow**:
- Supabase Auth handles email/password authentication
- Session persistence with automatic refresh
- Protected routes redirect to login when unauthenticated
- Role-based access control for admin features

**Kanban Board**:
- Uses @dnd-kit for drag-and-drop functionality
- Columns stored in `kanban_columns` table
- Tasks can be moved between columns
- Position-based ordering

**Task Management**:
- Tasks have status, priority, due dates, and assignees
- Support for subtasks
- File attachments
- Comment threads with @mentions
- Activity tracking

**Real-time Features**:
- Supabase auth state listeners for session changes
- Activity feeds update on database changes

### Styling and UI
- Tailwind CSS for utility-first styling
- CSS variables for theme customization
- Dark mode support through CSS variables
- Responsive design with mobile-aware components

### Form Handling
- React Hook Form for form state management
- Zod for schema validation
- Form components integrated with shadcn/ui

### Data Fetching
- TanStack Query for server state management
- Supabase client for database operations
- Optimistic updates for better UX

## Important Considerations

1. **Supabase Configuration**: The Supabase URL and anon key are hardcoded in `/src/integrations/supabase/client.ts`. In production, these should be environment variables.

2. **TypeScript Configuration**: The project uses TypeScript without strict mode, which may allow some type safety issues.

3. **No Test Suite**: The project currently has no tests. Consider adding tests when implementing new features.

4. **Build Output**: The production build outputs to the `dist` directory.

5. **Deployment**: Configured for Render.com deployment with `render.yaml` configuration file.

6. **Authentication Guards**: Always use `ProtectedRoute` or `AdminRoute` components for routes that require authentication.

7. **Database Operations**: All database operations should go through Supabase client with proper error handling.

8. **State Updates**: When updating global state (auth, profile, tasks), ensure proper error handling and loading states.