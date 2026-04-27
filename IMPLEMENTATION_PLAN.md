# Task Assignment & Proposal System - Implementation Plan

## Overview
Implement a complete task assignment workflow with real-time notifications, proposals, and todo list management for service providers and managers.

## Database Setup (SQL Already Provided)
See `SUPABASE_TASK_SYSTEM.sql` for:
- New tables: `task_responses`, `task_proposals`, `todo_list`, `task_messages`
- Updated notification types
- RLS policies for all tables
- Trigger functions for real-time notifications

**IMPORTANT**: Run the SQL in Supabase SQL editor before starting frontend implementation.

---

## Frontend Implementation Steps

### Phase 1: Enhanced Real-time Notifications

#### 1.1 Update Notification System
**File**: `client/components/layout/Header.tsx`
- Extend notification types to handle new actions
- Add sound/toast alerts for task assignments and proposals
- Link notifications to task details/actions

**Changes needed**:
```typescript
// Add handling for new notification types
'task_accepted' | 'task_declined' | 'task_proposed' | 
'proposal_accepted' | 'proposal_declined' | 'proposal_updated'
```

---

### Phase 2: Task Response UI Components

#### 2.1 Create Task Response Modal Component
**New File**: `client/components/TaskResponseModal.tsx`
- Display task details (title, description, budget, timeline)
- Show three action buttons: Accept, Decline, Propose
- Handle form submission for each action

**Functionality**:
- **Accept**: Confirms acceptance, creates notification for manager
- **Decline**: Shows text field for reason, notifies manager
- **Propose**: Shows quote form with fields:
  - Quoted Price
  - Proposed Timeline
  - Additional Notes
  - File Attachments

#### 2.2 Integrate Response Buttons in Task Card
**File**: `client/pages/TasksPage.tsx`
- Add conditional rendering: Show response buttons for assigned service providers
- Only show for tasks assigned to current user with `assigned_to` == provider profile ID
- Hide for managers (show different actions)

---

### Phase 3: Proposal Management

#### 3.1 Create Proposal Details Component
**New File**: `client/components/ProposalDetails.tsx`
- Display proposal information:
  - Provider name
  - Quoted price
  - Proposed timeline
  - Notes/attachments
  - Current status

#### 3.2 Create Manager Proposal Review Component
**New File**: `client/components/ManagerProposalReview.tsx`
- Show provider's proposal
- Action buttons for manager:
  - **Accept**: Approves proposal, task moves to todo list
  - **Decline**: Rejects with optional message
  - **Counter-Propose**: Opens form to propose different terms
  - **Request Info**: Ask provider for clarification

---

### Phase 4: Live Chat Implementation

#### 4.1 Implement Real Chat System
**Update File**: `client/pages/TasksPage.tsx`
- Replace mock messages with real-time chat from `task_messages` table
- Implement real-time subscriptions for messages
- Show sender, timestamp, and message content
- Support file attachments in messages

**Key features**:
- Fetch existing messages from `task_messages` table
- Subscribe to new messages using Supabase realtime
- Display messages in chronological order
- Only show chat if task is in negotiation (not yet concluded)

#### 4.2 Create Message Input Component
**New File**: `client/components/TaskMessageInput.tsx`
- Text input for messages
- File attachment support
- Send button with loading state
- Emoji support (optional)

---

### Phase 5: Todo List for Service Providers

#### 5.1 Enhance Todo List Tab
**Update File**: `client/pages/TasksPage.tsx`
- Show todos from `todo_list` table (tasks that were accepted)
- Display todos specific to current user (if service provider)
- Show managers all tasks they created

#### 5.2 Create Todo Item Component
**New File**: `client/components/TodoItem.tsx`
- Display todo details:
  - Title & Description
  - Priority
  - Due Date
  - Estimated Hours
  - Task specifics (budget, payment terms, etc.)
  - Original task reference

#### 5.3 Add Todo Status Management
**Update File**: `client/pages/TasksPage.tsx`
- Add status dropdown: Pending → In Progress → Completed
- Track completion date
- Show progress bar or completion percentage

---

### Phase 6: View Role-Based Access

#### 6.1 Modify Task Display Based on User Role
**File**: `client/pages/TasksPage.tsx`

**For Service Providers**:
- Show assigned tasks with response buttons
- Show active todos in "To do List" tab
- Show proposals they've made
- Show chat for active negotiations

**For Managers**:
- Show all created tasks
- Show response history
- Show active proposals to review
- Can create new tasks
- Can mark tasks as completed

---

### Phase 7: Real-time Synchronization

#### 7.1 Set up Supabase Realtime Subscriptions
- Subscribe to changes in `task_responses`, `task_proposals`, `task_messages`
- Auto-update UI when:
  - Provider responds to task
  - Manager reviews proposal
  - New messages arrive
  - Todo list updates

#### 7.2 Add Polling/Refresh
- Auto-refresh every 30 seconds
- Manual refresh button
- Optimistic updates for user actions

---

## Task Workflow Summary

### 1. Task Creation
Manager creates task → Assigns to provider → Provider gets notification

### 2. Provider Response
Provider sees task → 3 options:
- **Accept**: Task → Todo List Entry (in acceptance)
- **Decline**: Task → Archived (with reason)
- **Propose**: Task → Awaiting Manager Review

### 3. Proposal Review
If provider proposes:
- Manager sees proposal with quote
- Manager can: Accept, Decline, Counter-propose
- Negotiations via chat until agreement

### 4. Task Acceptance
When proposal accepted or direct acceptance:
- Entry created in `todo_list`
- Provider can track progress (Pending → In Progress → Completed)
- Manager can monitor completion

### 5. Chat During Negotiation
- Live chat available while task status = 'todo' (not concluded)
- Both parties can share files
- Chat history persists

---

## API Integration Points

### For Frontend to Supabase:

```typescript
// Insert task response
supabase.from('task_responses').insert({ task_id, provider_id, action, response_message })

// Insert proposal
supabase.from('task_proposals').insert({ task_id, provider_id, status: 'pending', quoted_price, proposal_notes, proposed_timeline })

// Update proposal status
supabase.from('task_proposals').update({ status }).eq('id', proposal_id)

// Insert message
supabase.from('task_messages').insert({ task_id, sender_id, sender_role, message_text })

// Create todo list entry (via trigger, but can be done manually)
supabase.from('todo_list').insert({ task_id, provider_id, title, description, details })

// Mark todo as completed
supabase.from('todo_list').update({ status: 'completed', completed_at: now() }).eq('id', todo_id)

// Real-time subscription
supabase.channel(`task:${task_id}`).on('postgres_changes', {...}).subscribe()
```

---

## UI Changes Summary

### TasksPage.tsx Updates:
1. Add role detection (manager vs service_provider)
2. Conditional task card rendering based on role
3. Filter todos to show only user's todos (providers) or created tasks (managers)
4. Add response modals and forms
5. Replace mock chat with real chat
6. Add todo status management UI

### New Components:
- `TaskResponseModal.tsx` - Accept/Decline/Propose actions
- `ProposalDetails.tsx` - View proposal information
- `ManagerProposalReview.tsx` - Manager proposal actions
- `TaskMessageInput.tsx` - Chat message input
- `TodoItem.tsx` - Todo list item display
- `ProposalForm.tsx` - Create/edit proposal with quote

---

## State Management

Use React hooks with Supabase subscriptions:
- Load tasks, todos, responses, proposals on mount
- Subscribe to realtime changes
- Update local state on subscription events
- Use loading/error states for better UX

---

## Testing Checklist

- [ ] Manager creates task → Provider gets notification
- [ ] Provider accepts task → Todo list created, manager notified
- [ ] Provider declines task → Task archived, manager notified
- [ ] Provider proposes → Manager sees proposal with quote
- [ ] Manager accepts proposal → Todo list created
- [ ] Manager counter-proposes → Provider sees new terms
- [ ] Chat works during negotiation
- [ ] Chat disabled after task concluded
- [ ] Real-time notifications work
- [ ] Role-based access control works
- [ ] Todo status updates work
- [ ] Filtering and searching work

---

## Deployment Notes

1. **Run Supabase SQL first** - Creates tables and RLS policies
2. **Update TypeScript types** - Already done in supabase.ts
3. **Deploy frontend changes** - Implement components in order
4. **Test with multiple users** - One manager, multiple providers
5. **Monitor realtime connections** - Ensure subscriptions work

---

## Performance Optimization

- Lazy load task details
- Pagination for task lists (if >50 tasks)
- Debounce search input
- Cache user profiles
- Optimize image loading for attachments

---

## Security Considerations

- RLS policies prevent unauthorized access
- Only assigned providers can respond to tasks
- Managers can only view tasks they created
- Messages filtered by task ownership
- Validate all inputs on backend (Supabase triggers handle this)
