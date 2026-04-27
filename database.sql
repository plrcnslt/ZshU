-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES TABLE (Multi-tenant with roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'manager', 'service_provider')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  room_number VARCHAR(10),
  -- Service provider fields
  service_type VARCHAR(100),
  service_category VARCHAR(50) CHECK (service_category IN ('internal', 'external')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- ============================================================================
-- COMPLAINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  room_number VARCHAR(10) NOT NULL,
  complaint_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for complaints
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_email ON public.complaints(email);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Managers can read all profiles" ON public.user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Managers can read all profiles (optional - for management dashboard)
CREATE POLICY "Managers can read all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- Complaints RLS Policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Anyone can submit complaint" ON public.complaints;
DROP POLICY IF EXISTS "Users can update own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Managers can read all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Managers can update all complaints" ON public.complaints;

-- Users can read their own complaints
CREATE POLICY "Users can read own complaints" ON public.complaints
  FOR SELECT
  USING (user_id = auth.uid() OR email = auth.jwt() ->> 'email');

-- Users can insert complaints (with or without auth)
CREATE POLICY "Anyone can submit complaint" ON public.complaints
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own complaints
CREATE POLICY "Users can update own complaints" ON public.complaints
  FOR UPDATE
  USING (user_id = auth.uid());

-- Managers can read all complaints
CREATE POLICY "Managers can read all complaints" ON public.complaints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- Managers can update all complaints
CREATE POLICY "Managers can update all complaints" ON public.complaints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- ============================================================================
-- AUTOMATIC PROFILE CREATION ON SIGNUP (REPLACES MANUAL INSERT)
-- ============================================================================

-- Function to automatically create a profile row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    'guest',  -- Default role is guest
    '',       -- Empty first name (to be filled in later)
    ''        -- Empty last name (to be filled in later)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that fires when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Create function to update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for complaints
DROP TRIGGER IF EXISTS update_complaints_updated_at ON public.complaints;
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================
-- NOTE: User profile samples are NO LONGER included here.
-- Profiles are automatically created when users sign up via Supabase Auth.
--
-- To test with user profiles:
-- 1. Use Supabase Auth to create test users
-- 2. Profiles will be automatically created
-- 3. Update profiles via the registration flow in the app

-- Insert sample complaints (no hard-coded user_id references)
INSERT INTO public.complaints (
  id, user_id, guest_name, email, room_number, complaint_type, description, priority, status, attachments, created_at, updated_at
) VALUES (
  'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
  NULL,
  'John Doe',
  'john.doe@example.com',
  '301',
  'Maintenance Issue',
  'The air conditioning in room 301 is not working properly. The temperature control is set to 72°F but the room is still very warm. This is affecting my comfort and sleep.',
  'urgent',
  'open',
  '[]'::jsonb,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.complaints (
  id, user_id, guest_name, email, room_number, complaint_type, description, priority, status, attachments, created_at, updated_at
) VALUES (
  'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
  NULL,
  'Sarah Johnson',
  'sarah.johnson@example.com',
  '205',
  'Cleanliness',
  'The bathroom had not been properly cleaned when we checked in. There were hairs in the sink and the towels were not fresh. We immediately requested housekeeping to come clean the room.',
  'high',
  'in_progress',
  '[]'::jsonb,
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.complaints (
  id, user_id, guest_name, email, room_number, complaint_type, description, priority, status, attachments, created_at, updated_at
) VALUES (
  'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3',
  NULL,
  'Michael Chen',
  'michael.chen@example.com',
  '420',
  'Noise/Disturbance',
  'There was excessive noise coming from the adjacent room late into the evening (past midnight). Despite requesting quiet hours, the noise continued. This significantly disrupted our sleep.',
  'medium',
  'resolved',
  '[]'::jsonb,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.complaints (
  id, user_id, guest_name, email, room_number, complaint_type, description, priority, status, attachments, created_at, updated_at
) VALUES (
  'a4a4a4a4-a4a4-a4a4-a4a4-a4a4a4a4a4a4',
  NULL,
  'Emma Wilson',
  'emma.wilson@example.com',
  '315',
  'Missing Items',
  'The room was missing several amenities that are typically provided: shower caps, sewing kits, and complimentary water bottles. These items are important for guest comfort.',
  'low',
  'resolved',
  '[]'::jsonb,
  NOW() - INTERVAL '18 hours',
  NOW() - INTERVAL '12 hours'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TASKS TABLE (For manager task management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'completed')),
  category VARCHAR(50) CHECK (category IN ('operations', 'service', 'training', 'maintenance')),
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assignee_name VARCHAR(255),
  assigned_category VARCHAR(50) CHECK (assigned_category IN ('internal', 'external')),
  due_date DATE,
  estimated_time VARCHAR(50),
  payment_terms TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_complaint_id ON public.tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE (For real-time manager notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('complaint_filed', 'complaint_acknowledged', 'task_created', 'task_updated', 'task_assigned')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_complaint_id ON public.notifications(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================================
-- RLS POLICIES FOR TASKS TABLE
-- ============================================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Managers can read all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Service providers can read assigned tasks" ON public.tasks;

-- Managers can read all tasks
CREATE POLICY "Managers can read all tasks" ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- Managers can create tasks
CREATE POLICY "Managers can create tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- Managers can update all tasks
CREATE POLICY "Managers can update all tasks" ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'manager'
    )
  );

-- Service providers can read tasks assigned to them
CREATE POLICY "Service providers can read assigned tasks" ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = assigned_to AND up.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES FOR NOTIFICATIONS TABLE
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGER FOR TASKS UPDATED_AT TIMESTAMP
-- ============================================================================
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO NOTIFY MANAGERS OF NEW COMPLAINTS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_managers_of_complaint()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all managers
  INSERT INTO public.notifications (user_id, complaint_id, type, message)
  SELECT
    up.user_id,
    NEW.id,
    'complaint_filed',
    'New complaint filed by ' || NEW.guest_name || ' in room ' || NEW.room_number
  FROM public.user_profiles up
  WHERE up.role = 'manager';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify managers when a new complaint is filed
DROP TRIGGER IF EXISTS on_complaint_filed ON public.complaints;
CREATE TRIGGER on_complaint_filed
  AFTER INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_of_complaint();

-- ============================================================================
-- FUNCTION TO NOTIFY RELEVANT USERS OF NEW TASKS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_task_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the assigned person if it's a service provider task
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT
      up.user_id,
      NEW.id,
      'task_assigned',
      'New task assigned to you: ' || NEW.title
    FROM public.user_profiles up
    WHERE up.id = NEW.assigned_to;
  END IF;

  -- Notify all managers about new task
  INSERT INTO public.notifications (user_id, task_id, type, message)
  SELECT
    up.user_id,
    NEW.id,
    'task_created',
    'New task created: ' || NEW.title
  FROM public.user_profiles up
  WHERE up.role = 'manager' AND up.user_id != NEW.created_by;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify users when a new task is created
DROP TRIGGER IF EXISTS on_task_created ON public.tasks;
CREATE TRIGGER on_task_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_created();

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables created:
--   1. user_profiles - Stores user data with multi-tenant role support
--      - Automatically populated via trigger on user signup
--      - Foreign key constraint maintains data integrity
--   2. complaints - Stores guest complaints with tracking and status management
--   3. tasks - Stores manager-created tasks, can be linked to complaints
--      - Can be assigned to internal staff or external contractors
--      - Tracks priority, status, and assignment
--   4. notifications - Real-time notification system for managers
--      - Automatically created when complaints are filed
--      - Automatically created when tasks are assigned
--
-- Automatic Features:
--   - User profiles created automatically on signup
--   - Managers notified when complaints are filed
--   - Users notified when tasks are assigned
--   - Timestamps automatically updated on record changes
--
-- RLS Policies:
--   - Users can manage their own data
--   - Managers have elevated access to view and manage complaints and tasks
--   - Public access for complaint submission (unauthenticated guests)
--   - Service providers can see tasks assigned to them
--
-- Sample Data:
--   - 4 Sample complaints with various statuses and priorities
--   - User profiles are created automatically when users sign up