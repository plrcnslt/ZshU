-- ============================================================================
-- TASK ASSIGNMENT SYSTEM - SUPABASE SQL SETUP
-- ============================================================================
-- This SQL adds comprehensive task workflow features including:
-- - Task responses (accept/decline/propose)
-- - Proposal system with quotes
-- - Todo list generation after task acceptance
-- - Live chat for task negotiation
-- - Real-time notifications
-- ============================================================================

-- ============================================================================
-- 1. UPDATE NOTIFICATIONS TABLE - Add new notification types
-- ============================================================================

-- First, check if the notifications table type constraint exists and update it
-- Note: If the constraint exists, you may need to drop and recreate it

-- Add new notification types to the existing constraint
-- IMPORTANT: This requires dropping and recreating the constraint
-- Run this in the Supabase SQL editor:

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (
  (type)::text = ANY (
    ARRAY[
      'complaint_filed'::character varying,
      'complaint_acknowledged'::character varying,
      'task_created'::character varying,
      'task_updated'::character varying,
      'task_assigned'::character varying,
      'task_accepted'::character varying,
      'task_declined'::character varying,
      'task_proposed'::character varying,
      'proposal_accepted'::character varying,
      'proposal_declined'::character varying,
      'proposal_updated'::character varying,
      'todo_created'::character varying,
      'task_message'::character varying
    ]::text[]
  )
);

-- ============================================================================
-- 2. CREATE TASK_RESPONSES TABLE - Track accept/decline/propose actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_responses (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  task_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  action character varying(50) NOT NULL, -- 'accept', 'decline', 'propose'
  response_message text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT task_responses_pkey PRIMARY KEY (id),
  CONSTRAINT task_responses_task_id_fkey FOREIGN KEY (task_id) 
    REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_responses_provider_id_fkey FOREIGN KEY (provider_id) 
    REFERENCES user_profiles (id) ON DELETE CASCADE,
  CONSTRAINT task_responses_action_check CHECK (
    (action)::text = ANY (
      ARRAY['accept'::character varying, 'decline'::character varying, 'propose'::character varying]::text[]
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_responses_task_id 
  ON public.task_responses USING btree (task_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_responses_provider_id 
  ON public.task_responses USING btree (provider_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_responses_action 
  ON public.task_responses USING btree (action) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_responses_created_at 
  ON public.task_responses USING btree (created_at DESC) TABLESPACE pg_default;

CREATE TRIGGER update_task_responses_updated_at BEFORE UPDATE 
  ON task_responses FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CREATE TASK_PROPOSALS TABLE - Store quotes and proposal details
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_proposals (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  task_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  manager_id uuid NOT NULL, -- Manager who will review the proposal
  status character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  quoted_price numeric(12, 2) NULL,
  proposal_notes text NULL,
  proposed_timeline character varying(100) NULL, -- e.g., "2-3 days", "1 week"
  attachments jsonb NULL DEFAULT '[]'::jsonb, -- Additional proposal documents
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT task_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT task_proposals_task_id_fkey FOREIGN KEY (task_id) 
    REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_proposals_provider_id_fkey FOREIGN KEY (provider_id) 
    REFERENCES user_profiles (id) ON DELETE CASCADE,
  CONSTRAINT task_proposals_manager_id_fkey FOREIGN KEY (manager_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT task_proposals_status_check CHECK (
    (status)::text = ANY (
      ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'counter_proposed'::character varying]::text[]
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_proposals_task_id 
  ON public.task_proposals USING btree (task_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_proposals_provider_id 
  ON public.task_proposals USING btree (provider_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_proposals_manager_id 
  ON public.task_proposals USING btree (manager_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_proposals_status 
  ON public.task_proposals USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_proposals_created_at 
  ON public.task_proposals USING btree (created_at DESC) TABLESPACE pg_default;

CREATE TRIGGER update_task_proposals_updated_at BEFORE UPDATE 
  ON task_proposals FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CREATE TODO_LIST TABLE - Service provider todo list after task acceptance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.todo_list (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  task_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  status character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  title character varying(255) NOT NULL,
  description text NULL,
  priority character varying(20) NOT NULL DEFAULT 'medium'::character varying,
  due_date date NULL,
  estimated_hours numeric(5, 2) NULL,
  details jsonb NULL, -- JSON structure containing task specifics
  attachments jsonb NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  completed_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT todo_list_pkey PRIMARY KEY (id),
  CONSTRAINT todo_list_task_id_fkey FOREIGN KEY (task_id) 
    REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT todo_list_provider_id_fkey FOREIGN KEY (provider_id) 
    REFERENCES user_profiles (id) ON DELETE CASCADE,
  CONSTRAINT todo_list_status_check CHECK (
    (status)::text = ANY (
      ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying]::text[]
    )
  ),
  CONSTRAINT todo_list_priority_check CHECK (
    (priority)::text = ANY (
      ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[]
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_todo_list_task_id 
  ON public.todo_list USING btree (task_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_todo_list_provider_id 
  ON public.todo_list USING btree (provider_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_todo_list_status 
  ON public.todo_list USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_todo_list_priority 
  ON public.todo_list USING btree (priority) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_todo_list_created_at 
  ON public.todo_list USING btree (created_at DESC) TABLESPACE pg_default;

CREATE TRIGGER update_todo_list_updated_at BEFORE UPDATE 
  ON todo_list FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CREATE TASK_MESSAGES TABLE - Live chat for task negotiation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_messages (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  task_id uuid NOT NULL,
  sender_id uuid NOT NULL, -- References auth.users
  sender_role character varying(50) NOT NULL, -- 'manager' or 'service_provider'
  message_text text NOT NULL,
  attachments jsonb NULL DEFAULT '[]'::jsonb,
  is_read boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT task_messages_pkey PRIMARY KEY (id),
  CONSTRAINT task_messages_task_id_fkey FOREIGN KEY (task_id) 
    REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT task_messages_sender_id_fkey FOREIGN KEY (sender_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT task_messages_sender_role_check CHECK (
    (sender_role)::text = ANY (
      ARRAY['manager'::character varying, 'service_provider'::character varying]::text[]
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_messages_task_id 
  ON public.task_messages USING btree (task_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_messages_sender_id 
  ON public.task_messages USING btree (sender_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_messages_created_at 
  ON public.task_messages USING btree (created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_task_messages_is_read 
  ON public.task_messages USING btree (is_read) TABLESPACE pg_default;

CREATE TRIGGER update_task_messages_updated_at BEFORE UPDATE 
  ON task_messages FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. CREATE RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.task_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASK_RESPONSES RLS POLICIES
-- ============================================================================

-- Managers can view all task responses for their created tasks
CREATE POLICY "Managers can view task responses for their tasks"
  ON public.task_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_responses.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Service providers can view their own responses
CREATE POLICY "Providers can view their own responses"
  ON public.task_responses FOR SELECT
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Service providers can insert responses to assigned tasks
CREATE POLICY "Providers can insert responses to assigned tasks"
  ON public.task_responses FOR INSERT
  WITH CHECK (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_responses.task_id
      AND tasks.assigned_to = (
        SELECT id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Service providers can update their own responses
CREATE POLICY "Providers can update their own responses"
  ON public.task_responses FOR UPDATE
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TASK_PROPOSALS RLS POLICIES
-- ============================================================================

-- Managers can view proposals for their tasks
CREATE POLICY "Managers can view proposals for their tasks"
  ON public.task_proposals FOR SELECT
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_proposals.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Service providers can view their own proposals
CREATE POLICY "Providers can view their own proposals"
  ON public.task_proposals FOR SELECT
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Service providers can create proposals
CREATE POLICY "Providers can create proposals"
  ON public.task_proposals FOR INSERT
  WITH CHECK (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Managers can update proposal status
CREATE POLICY "Managers can update proposal status"
  ON public.task_proposals FOR UPDATE
  USING (
    manager_id = auth.uid()
  );

-- Service providers can update their own proposals
CREATE POLICY "Providers can update their own proposals"
  ON public.task_proposals FOR UPDATE
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- TODO_LIST RLS POLICIES
-- ============================================================================

-- Service providers can view their own todos
CREATE POLICY "Providers can view their own todos"
  ON public.todo_list FOR SELECT
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Managers can view todos for tasks they created
CREATE POLICY "Managers can view todos for their tasks"
  ON public.todo_list FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = todo_list.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Service providers can update their own todos
CREATE POLICY "Providers can update their own todos"
  ON public.todo_list FOR UPDATE
  USING (
    provider_id = (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- System can insert todos (via trigger or backend)
CREATE POLICY "System can insert todos"
  ON public.todo_list FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TASK_MESSAGES RLS POLICIES
-- ============================================================================

-- Managers can view messages for their tasks
CREATE POLICY "Managers can view task messages"
  ON public.task_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_messages.task_id
      AND tasks.created_by = auth.uid()
    )
  );

-- Service providers can view messages for their assigned tasks
CREATE POLICY "Providers can view task messages"
  ON public.task_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_messages.task_id
      AND tasks.assigned_to = (
        SELECT id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Authenticated users can insert messages for tasks they're involved with
CREATE POLICY "Users can insert messages for their tasks"
  ON public.task_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_messages.task_id
        AND (
          tasks.created_by = auth.uid()
          OR tasks.assigned_to = (
            SELECT id FROM user_profiles WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.task_messages FOR UPDATE
  USING (
    sender_id = auth.uid()
  );

-- ============================================================================
-- 7. CREATE TRIGGER FUNCTIONS FOR NOTIFICATIONS
-- ============================================================================

-- Function to notify provider when task is assigned
CREATE OR REPLACE FUNCTION notify_provider_on_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to changed to a non-null value
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT 
      up.user_id,
      NEW.id,
      'task_assigned'::character varying,
      'You have been assigned a new task: ' || NEW.title
    FROM user_profiles up
    WHERE up.id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tasks table if not already exists
DROP TRIGGER IF EXISTS on_task_assigned ON public.tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_on_task_assigned();

-- Function to notify manager when provider responds to task
CREATE OR REPLACE FUNCTION notify_manager_on_task_response()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, task_id, type, message)
  SELECT 
    t.created_by,
    NEW.task_id,
    CASE 
      WHEN NEW.action = 'accept' THEN 'task_accepted'::character varying
      WHEN NEW.action = 'decline' THEN 'task_declined'::character varying
      WHEN NEW.action = 'propose' THEN 'task_proposed'::character varying
    END,
    (
      SELECT CONCAT(up.first_name, ' ', up.last_name, ' has ', NEW.action, 'ed your task: ', t.title)
      FROM user_profiles up
      WHERE up.id = NEW.provider_id
    )
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task responses
DROP TRIGGER IF EXISTS on_task_response ON public.task_responses;
CREATE TRIGGER on_task_response
  AFTER INSERT ON public.task_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_manager_on_task_response();

-- Function to notify provider on proposal status update
CREATE OR REPLACE FUNCTION notify_provider_on_proposal_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT 
      up.user_id,
      NEW.task_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'proposal_accepted'::character varying
        WHEN NEW.status = 'declined' THEN 'proposal_declined'::character varying
        WHEN NEW.status = 'counter_proposed' THEN 'proposal_updated'::character varying
      END,
      'Your proposal for task has been ' || NEW.status
    FROM user_profiles up
    WHERE up.id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for proposal updates
DROP TRIGGER IF EXISTS on_proposal_update ON public.task_proposals;
CREATE TRIGGER on_proposal_update
  AFTER UPDATE ON public.task_proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_on_proposal_update();

-- Function to create todo list when task is accepted
CREATE OR REPLACE FUNCTION create_todo_on_task_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a todo list entry when task is accepted
  IF NEW.action = 'accept' THEN
    INSERT INTO public.todo_list (
      task_id,
      provider_id,
      title,
      description,
      priority,
      due_date,
      details,
      status
    )
    SELECT
      t.id,
      NEW.provider_id,
      t.title,
      t.description,
      t.priority,
      t.due_date,
      jsonb_build_object(
        'category', t.category,
        'estimated_time', t.estimated_time,
        'payment_terms', t.payment_terms,
        'budget', t.budget
      ),
      'pending'::character varying
    FROM tasks t
    WHERE t.id = NEW.task_id;

    -- Notify the provider that a todo has been created
    INSERT INTO public.notifications (user_id, task_id, type, message)
    SELECT 
      up.user_id,
      NEW.task_id,
      'todo_created'::character varying,
      'A todo list entry has been created for your accepted task'
    FROM user_profiles up
    WHERE up.id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for todo generation
DROP TRIGGER IF EXISTS on_task_acceptance_create_todo ON public.task_responses;
CREATE TRIGGER on_task_acceptance_create_todo
  AFTER INSERT ON public.task_responses
  FOR EACH ROW
  EXECUTE FUNCTION create_todo_on_task_acceptance();

-- ============================================================================
-- 8. HELPER FUNCTIONS FOR FRONTEND INTEGRATION
-- ============================================================================

-- Function to get task with related data
CREATE OR REPLACE FUNCTION get_task_with_details(task_id_param uuid)
RETURNS TABLE (
  task_id uuid,
  title varchar,
  description text,
  status varchar,
  priority varchar,
  assigned_to uuid,
  assignee_name varchar,
  assigned_provider_user_id uuid,
  created_by uuid,
  manager_name varchar,
  latest_response varchar,
  latest_proposal_status varchar,
  has_active_proposal boolean,
  messages_count bigint,
  todo_id uuid,
  todo_status varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.assigned_to,
    t.assignee_name,
    up.user_id,
    t.created_by,
    CONCAT(mp.first_name, ' ', mp.last_name),
    (SELECT action FROM task_responses WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1)::varchar,
    (SELECT status FROM task_proposals WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1)::varchar,
    EXISTS(SELECT 1 FROM task_proposals WHERE task_id = t.id AND status = 'pending'),
    (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id),
    tl.id,
    tl.status::varchar
  FROM tasks t
  LEFT JOIN user_profiles up ON t.assigned_to = up.id
  LEFT JOIN user_profiles mp ON EXISTS(SELECT 1 FROM auth.users WHERE id = t.created_by)
  LEFT JOIN todo_list tl ON t.id = tl.task_id
  WHERE t.id = task_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. GRANT PERMISSIONS (Run these if using service role)
-- ============================================================================
-- IMPORTANT: Make sure to update the RLS policies above if you need different access patterns

-- Grant select permissions
-- GRANT SELECT ON task_responses TO authenticated;
-- GRANT SELECT ON task_proposals TO authenticated;
-- GRANT SELECT ON todo_list TO authenticated;
-- GRANT SELECT ON task_messages TO authenticated;

-- Grant insert/update permissions
-- GRANT INSERT, UPDATE ON task_responses TO authenticated;
-- GRANT INSERT, UPDATE ON task_proposals TO authenticated;
-- GRANT UPDATE ON todo_list TO authenticated;
-- GRANT INSERT, UPDATE ON task_messages TO authenticated;
