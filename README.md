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
The system manages two main entities:
- **Conventions**: Core business entity with fields for convention number, date, description, amount, status, operation type, and contractor
- **Users**: Authentication entity with username and password

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
