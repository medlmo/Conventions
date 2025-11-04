# Convention Management System

## Overview

This is a full-stack web application built for managing conventions (اتفاقيات) with a focus on Arabic language support. The system provides CRUD operations for convention records including details like convention numbers, dates, descriptions, amounts, status tracking, and contractor information.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with RTL (right-to-left) support for Arabic
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Middleware**: Custom logging and error handling
- **Development Server**: Hot reload with Vite integration

### Data Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon serverless)
- **Schema**: Shared TypeScript definitions between client and server
- **Validation**: Zod schemas for runtime type checking

## Key Components

### Database Schema
The system manages three main entities:
- **Conventions**: Core business entity with fields for convention number, date, description, amount, status, operation type, and contractor
- **Users**: Authentication entity with username and password
- **Administrative Events**: Tracking entity for recording administrative events related to conventions (e.g., "sent for visa on 12/12/2023")

### API Endpoints
- `GET /api/conventions` - Retrieve all conventions
- `GET /api/conventions/:id` - Retrieve specific convention
- `POST /api/conventions` - Create new convention
- `PUT /api/conventions/:id` - Update existing convention
- `DELETE /api/conventions/:id` - Delete convention

### UI Components
- Convention listing with data table
- Form modal for creating/editing conventions
- Delete confirmation dialog
- Search and filtering capabilities
- Status badge system with Arabic labels
- Currency formatting for amounts

## Data Flow

1. **Client Requests**: React components use TanStack Query hooks to fetch data
2. **API Layer**: Express routes handle HTTP requests and validate input
3. **Data Access**: Storage layer abstracts database operations
4. **Database**: PostgreSQL stores convention and user data
5. **Response**: JSON data flows back through the same path

The application currently uses an in-memory storage implementation that can be easily swapped for a database-backed implementation.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM with Zod integration
- **@tanstack/react-query**: Server state management
- **@hookform/resolvers**: Form validation integration
- **wouter**: Lightweight routing

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component styling variants
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution for development

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:
- **Build Process**: Vite builds the client, esbuild bundles the server
- **Production Server**: Serves static files and API from a single Node.js process
- **Database**: PostgreSQL instance with connection via environment variables
- **Port Configuration**: Runs on port 5000 (mapped to port 80 externally)

### Environment Setup
- Node.js 20 runtime environment
- PostgreSQL 16 database module
- Web module for static file serving

## Recent Changes

- June 24, 2025: Initial setup with basic convention management
- June 24, 2025: Added authentication system with role-based access control
  - Three user roles: Admin, Editor, Viewer
  - Session-based authentication with PostgreSQL
  - Complete user management interface for admins
  - Role-based permissions for all operations
- June 24, 2025: Separated dashboard from conventions management
  - Created dedicated dashboard tab with statistics overview
  - Simplified dashboard to show only statistics without actions
  - Improved user experience with better organization
- June 24, 2025: Enhanced convention form with new fields
  - Added السنة (Year), الدورة (Session), المجال (Domain) fields
  - Replaced نوع العملية with القطاع (Sector) field
  - Added رقم المقرر (Decision Number) field
  - Updated currency display from SAR to MAD throughout form
- June 24, 2025: Implemented file attachment system
  - Added file upload functionality to convention forms
  - Support for PDF, Word, Excel, and image files (10MB limit)
  - Secure file storage with multer middleware
  - Download functionality for attached files
  - File management in both form editing and convention viewing
  - Added convention export feature in viewing modal (downloads as Word document via server-side generation)
  - Fixed file attachment download functionality with proper authentication
  - Enhanced error handling for document generation
  - Moved Word document generation to server-side to avoid browser compatibility issues
- January 24, 2025: Added file upload functionality to convention forms
  - Implemented secure file upload with multer for PDF, Word, Excel, and image files
  - Added attachments field to database schema and storage operations
  - Created drag-and-drop file upload interface with progress indicators
  - Added file management (upload, view, delete) with proper authentication
  - Files are stored securely in uploads directory with unique filenames
- November 4, 2025: Implemented administrative tracking system for conventions
  - Added administrativeEvents table to database schema with event date, description, and notes
  - Created CRUD API endpoints for managing administrative events (GET, POST, PUT, DELETE)
  - Implemented AdministrativeTracking component with complete event management UI
  - Integrated administrative tracking into convention details page as a dedicated tab
  - Applied role-based access control (Admin/Editor can create/edit, all users can view)
  - Follows project conventions: shared types, Form + useForm + zodResolver pattern, apiRequest helper, proper cache invalidation

## User Preferences

- Preferred communication style: Simple, everyday language
- Number formatting: Use Western/English digits instead of Arabic digits
- Currency: Use Moroccan Dirham (MAD/د.م) instead of Saudi Riyal (SAR/ر.س)
- UI preferences: Remove settings page, focus on core functionality