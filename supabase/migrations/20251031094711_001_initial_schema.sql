/*
  # Initial Schema Setup for Convention Management System

  1. New Tables
    - `sessions` - Session storage for authentication
      - `sid` (varchar, primary key) - Session ID
      - `sess` (jsonb) - Session data
      - `expire` (timestamp) - Expiration time
    
    - `users` - User accounts with role-based access control
      - `id` (varchar, primary key) - User ID
      - `username` (varchar, unique) - Login username
      - `password` (varchar) - Hashed password
      - `role` (text) - User role (admin, editor, viewer)
      - `first_name` (varchar) - First name
      - `last_name` (varchar) - Last name
      - `email` (varchar, unique) - Email address
      - `profile_image_url` (varchar) - Profile image
      - `is_active` (text) - Active status
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp
    
    - `conventions` - Convention records
      - `id` (serial, primary key) - Convention ID
      - `convention_number` (text, unique) - Convention number
      - `date` (text) - Convention date
      - `description` (text) - Convention description
      - `amount` (decimal) - Total cost amount
      - `contribution` (decimal) - Regional contribution
      - `status` (text) - Convention status
      - `year` (text) - Year
      - `session` (text) - Session
      - `domain` (text) - Domain
      - `sector` (text) - Sector
      - `decision_number` (text) - Decision number
      - `contractor` (text) - Project owner
      - `delegated_project_owner` (text) - Delegated project owner
      - `execution_type` (text) - Execution type
      - `validity` (text) - Convention validity period
      - `jurisdiction` (text) - Jurisdiction type
      - `province` (text) - Province/Prefecture (JSON array)
      - `partners` (text) - Partners (JSON array)
      - `attachments` (text) - File attachments (JSON array)
      - `programme` (text) - Programme type
      - `created_by` (varchar) - Creator user ID
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated user access
*/

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid varchar PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Create users table with roles
CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY,
  username varchar UNIQUE NOT NULL,
  password varchar NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  first_name varchar,
  last_name varchar,
  email varchar UNIQUE,
  profile_image_url varchar,
  is_active text NOT NULL DEFAULT 'true',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create conventions table
CREATE TABLE IF NOT EXISTS conventions (
  id serial PRIMARY KEY,
  convention_number text UNIQUE NOT NULL,
  date text NOT NULL,
  description text NOT NULL,
  amount decimal(12, 2),
  contribution decimal(12, 2),
  status text NOT NULL,
  year text NOT NULL,
  session text NOT NULL,
  domain text NOT NULL,
  sector text NOT NULL,
  decision_number text NOT NULL,
  contractor text NOT NULL,
  delegated_project_owner text,
  execution_type text,
  validity text,
  jurisdiction text,
  province text,
  partners text,
  attachments text,
  programme text,
  created_by varchar REFERENCES users(id),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conventions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Conventions table policies
CREATE POLICY "Authenticated users can view conventions"
  ON conventions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can create conventions"
  ON conventions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can update conventions"
  ON conventions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete conventions"
  ON conventions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role IN ('admin', 'editor')
    )
  );