import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
} from "../components/ui/tabs";
import {
  CheckSquare,
  PlusCircle,
  MessageSquare,
  Filter,
  Grid3x3,
  List,
  Search,
  Send,
  Clock,
  AlertCircle,
  CheckCircle,
  Flag,
  Archive,
  TrendingUp,
  Users,
  Copy,
  Loader,
  Tag,
} from "lucide-react";
import { supabase, Task as TaskType, Complaint, TaskResponse, TaskProposal, TodoListItem, UserProfile } from "../lib/supabase";
import { toast } from "../hooks/use-toast";
import FileUploadZone, { FileAttachment } from "../components/FileUploadZone";
import AttachmentList from "../components/AttachmentList";
import { useFileUpload } from "../hooks/useFileUpload";
import TaskResponseModal from "../components/TaskResponseModal";
import ManagerProposalReview from "../components/ManagerProposalReview";
import TodoItem from "../components/TodoItem";
import TaskChat from "../components/TaskChat";

interface TaskUI extends TaskType {
  // Extended UI properties for display
  category?: "operations" | "service" | "training" | "maintenance";
  assignedTo?: string;
  dueDate?: string;
  createdAt?: string;
  estimatedTime?: string;
  checklist?: string[];
}

interface Message {
  id: string;
  taskId: string;
  author: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

const TasksPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { linkToTask, getTaskAttachments, getComplaintAttachments } = useFileUpload();

  // Determine active tab from URL path
  const getTabFromPath = () => {
    if (location.pathname.includes("/tasks/list")) return "todo-list";
    if (location.pathname.includes("/tasks/chat")) return "live-chat";
    return "new-task";
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [taskAttachments, setTaskAttachments] = useState<Map<string, FileAttachment[]>>(new Map());

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    category: "",
    assignmentType: "",
    assignee: "",
    dueDate: "",
    estimatedTime: "",
    paymentTerms: "",
    budget: "",
  });

  // File attachments state
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);

  // Data state
  const [tasks, setTasks] = useState<TaskUI[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<"guest" | "manager" | "service_provider" | null>(null);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  const [externalVendors, setExternalVendors] = useState<any[]>([]);

  // Task responses and proposals
  const [taskResponses, setTaskResponses] = useState<TaskResponse[]>([]);
  const [taskProposals, setTaskProposals] = useState<TaskProposal[]>([]);
  const [todoItems, setTodoItems] = useState<TodoListItem[]>([]);

  // Modal states
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedTaskForResponse, setSelectedTaskForResponse] = useState<TaskUI | null>(null);

  // Sync URL with tab changes
  useEffect(() => {
    const newTab = getTabFromPath();
    setActiveTab(newTab);
  }, [location.pathname]);

  // Subscribe to real-time updates for task responses, proposals, and todos
  useEffect(() => {
    // Subscribe to task responses
    const responsesSubscription = supabase
      .channel("task_responses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_responses",
        },
        () => {
          // Reload task responses when any change occurs
          supabase
            .from("task_responses")
            .select("*")
            .order("created_at", { ascending: false })
            .then(({ data }) => setTaskResponses(data || []));
        }
      )
      .subscribe();

    // Subscribe to task proposals
    const proposalsSubscription = supabase
      .channel("task_proposals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_proposals",
        },
        () => {
          // Reload task proposals when any change occurs
          supabase
            .from("task_proposals")
            .select("*")
            .order("created_at", { ascending: false })
            .then(({ data }) => setTaskProposals(data || []));
        }
      )
      .subscribe();

    // Subscribe to todo list
    const todosSubscription = supabase
      .channel("todo_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todo_list",
          filter: currentUserProfile ? `provider_id=eq.${currentUserProfile.id}` : undefined,
        },
        () => {
          if (currentUserProfile) {
            supabase
              .from("todo_list")
              .select("*")
              .eq("provider_id", currentUserProfile.id)
              .order("created_at", { ascending: false })
              .then(({ data }) => setTodoItems(data || []));
          }
        }
      )
      .subscribe();

    return () => {
      responsesSubscription.unsubscribe();
      proposalsSubscription.unsubscribe();
      todosSubscription.unsubscribe();
    };
  }, [currentUserProfile]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "new-task") navigate("/tasks/new");
    else if (tab === "todo-list") navigate("/tasks/list");
    else if (tab === "live-chat") navigate("/tasks/chat");
  };

  // Load user, complaints, tasks, and assignees from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);

        // Get current user's profile and role
        if (user) {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profileData) {
            setCurrentUserProfile(profileData);
            setUserRole(profileData.role as "guest" | "manager" | "service_provider");
          }
        }

        // Load internal staff (service_category = 'internal')
        const { data: internalData, error: internalError } = await supabase
          .from("user_profiles")
          .select("id, email, first_name, last_name, service_type, role")
          .eq("service_category", "internal");

        if (internalError) throw internalError;
        setInternalStaff(internalData || []);

        // Load external vendors (service_category = 'external')
        const { data: externalData, error: externalError } = await supabase
          .from("user_profiles")
          .select("id, email, first_name, last_name, service_type, role")
          .eq("service_category", "external");

        if (externalError) throw externalError;
        setExternalVendors(externalData || []);

        // Load complaints (for managers to convert to tasks)
        const { data: complaintsData, error: complaintsError } = await supabase
          .from("complaints")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false });

        if (complaintsError) throw complaintsError;
        setComplaints(complaintsData || []);

        // Load tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Load task responses
        const { data: responsesData } = await supabase
          .from("task_responses")
          .select("*")
          .order("created_at", { ascending: false });
        setTaskResponses(responsesData || []);

        // Load task proposals
        const { data: proposalsData } = await supabase
          .from("task_proposals")
          .select("*")
          .order("created_at", { ascending: false });
        setTaskProposals(proposalsData || []);

        // Load todo list items (for service providers)
        if (user && profileData?.role === "service_provider") {
          const { data: todosData } = await supabase
            .from("todo_list")
            .select("*")
            .eq("provider_id", profileData.id)
            .order("created_at", { ascending: false });
          setTodoItems(todosData || []);
        }

        // Load attachments for all tasks
        if (tasksData && tasksData.length > 0) {
          const attachmentsMap = new Map<string, FileAttachment[]>();

          for (const task of tasksData) {
            const attachments = await getTaskAttachments(task.id);
            attachmentsMap.set(task.id, attachments as FileAttachment[]);
          }

          setTaskAttachments(attachmentsMap);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load tasks and complaints",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getTaskAttachments, getComplaintAttachments]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-yellow-50 border-l-4 border-l-yellow-500";
      case "in_progress":
        return "bg-blue-50 border-l-4 border-l-blue-500";
      case "in_review":
        return "bg-purple-50 border-l-4 border-l-purple-500";
      case "completed":
        return "bg-green-50 border-l-4 border-l-green-500";
      default:
        return "bg-gray-50 border-l-4 border-l-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "in_review":
        return <Flag className="h-4 w-4 text-purple-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate dashboard stats
  const stats = {
    open: tasks.filter((t) => t.status !== "completed").length,
    urgent: tasks.filter((t) => t.priority === "urgent").length,
    completedToday: tasks.filter(
      (t) =>
        t.status === "completed" &&
        new Date(t.created_at).toDateString() === new Date().toDateString()
    ).length,
    awaitingChat: messages.filter(
      (m) => {
        const task = tasks.find((t) => t.id === m.taskId);
        return task && task.status !== "completed";
      }
    ).length,
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.priority || !formData.assignmentType || !formData.assignee) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the assigned user ID from the selected assignee
      const assignees = formData.assignmentType === "internal" ? internalStaff : externalVendors;
      const selectedAssignee = assignees.find(
        (a) => `${a.first_name} ${a.last_name} - ${a.service_type}` === formData.assignee ||
               `${a.email}` === formData.assignee
      );

      // Create task in Supabase (without attachments - we'll link them separately)
      const taskData = {
        complaint_id: selectedComplaint?.id || null,
        title: formData.title,
        description: formData.description,
        priority: formData.priority as "low" | "medium" | "high" | "urgent",
        category: (formData.category as "operations" | "service" | "training" | "maintenance") || null,
        status: "todo",
        assigned_to: selectedAssignee?.id || null,
        assignee_name: formData.assignee,
        assigned_category: formData.assignmentType as "internal" | "external",
        due_date: formData.dueDate || null,
        estimated_time: formData.estimatedTime || null,
        payment_terms: formData.paymentTerms || null,
        is_from_complaint: selectedComplaint !== null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        created_by: currentUser?.id,
      };

      const { data: createdTask, error: taskError } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();

      if (taskError) throw taskError;

      // Link attachments to the task
      if (createdTask && fileAttachments.length > 0) {
        for (const attachment of fileAttachments) {
          const success = await linkToTask(attachment.attachmentId, createdTask.id);
          if (!success) {
            console.warn(`Failed to link attachment ${attachment.attachmentId} to task`);
          }
        }
      }

      toast({
        title: "Success",
        description: `Task created and assigned to ${formData.assignee}!`,
      });

      // Reload tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      setTasks(tasksData || []);

      // Load attachments for the newly created task
      const newAttachments = await getTaskAttachments(createdTask.id);
      setTaskAttachments((prev) => {
        const updated = new Map(prev);
        updated.set(createdTask.id, newAttachments as FileAttachment[]);
        return updated;
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "",
        category: "",
        assignmentType: "",
        assignee: "",
        dueDate: "",
        estimatedTime: "",
        paymentTerms: "",
        budget: "",
      });
      setFileAttachments([]);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectComplaint = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    // Prefill form with complaint data
    setFormData((prev) => ({
      ...prev,
      title: `Address: ${complaint.complaint_type} - ${complaint.room_number}`,
      description: complaint.description,
      priority: complaint.priority as any,
    }));

    // Auto-populate attachments from complaint (from normalized table, not JSONB)
    try {
      const complaintAttachments = await getComplaintAttachments(complaint.id);
      if (complaintAttachments && complaintAttachments.length > 0) {
        setFileAttachments(complaintAttachments as FileAttachment[]);
      }
    } catch (error) {
      console.error("Error loading complaint attachments:", error);
    }
  };

  const handleAcceptComplaint = async (complaint: Complaint) => {
    setIsSubmitting(true);
    try {
      // 1. Update complaint status to acknowledged
      const { error: updateError } = await supabase
        .from("complaints")
        .update({ status: "acknowledged" })
        .eq("id", complaint.id);

      if (updateError) throw updateError;

      // 2. Create notification for the guest
      if (complaint.user_id) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert([
            {
              user_id: complaint.user_id,
              complaint_id: complaint.id,
              type: "complaint_acknowledged",
              message: "Your complaint has been received. Help is on the way!",
              is_read: false,
            },
          ]);

        if (notificationError) {
          console.error("Failed to create notification:", notificationError);
        }
      }

      // 3. Select complaint and prefill form (now async)
      await handleSelectComplaint(complaint);

      // 4. Update local complaints list to remove this one
      setComplaints((prev) => prev.filter((c) => c.id !== complaint.id));

      toast({
        title: "Success",
        description: "Complaint acknowledged. Guest has been notified.",
      });

      // Scroll to form
      setTimeout(() => {
        const formElement = document.querySelector('[data-task-form]');
        if (formElement) {
          formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error) {
      console.error("Error accepting complaint:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to acknowledge complaint",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedTask) return;

    const newMessage: Message = {
      id: `MSG-${Date.now()}`,
      taskId: selectedTask,
      author: "Current User",
      content: chatMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, newMessage]);
    setChatMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sheraton-cream to-background">
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <CheckSquare className="h-8 w-8 text-sheraton-gold mr-2" />
            <Badge className="bg-sheraton-gold text-sheraton-navy px-4 py-2">
              Task Management
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-sheraton-navy mb-4">
            Task Management System
          </h1>
          <p className="text-lg text-muted-foreground">
            Create, assign, and track tasks efficiently
          </p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500 sheraton-gradient text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Open Tasks</p>
                  <p className="text-3xl font-bold">{stats.open}</p>
                </div>
                <Clock className="h-10 w-10 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Urgent Tasks</p>
                  <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-red-500 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completed Today</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sheraton-gold">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Chats</p>
                  <p className="text-3xl font-bold text-sheraton-gold">{stats.awaitingChat}</p>
                </div>
                <MessageSquare className="h-10 w-10 text-sheraton-gold opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1 flex">
            <button
              onClick={() => handleTabChange("new-task")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === "new-task"
                  ? "bg-sheraton-gold text-sheraton-navy shadow-sm"
                  : "text-gray-600 hover:text-sheraton-navy"
              }`}
            >
              New Task
            </button>
            <button
              onClick={() => handleTabChange("todo-list")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === "todo-list"
                  ? "bg-sheraton-gold text-sheraton-navy shadow-sm"
                  : "text-gray-600 hover:text-sheraton-navy"
              }`}
            >
              To Do List
            </button>
            <button
              onClick={() => handleTabChange("live-chat")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === "live-chat"
                  ? "bg-sheraton-gold text-sheraton-navy shadow-sm"
                  : "text-gray-600 hover:text-sheraton-navy"
              }`}
            >
              Live Chat
            </button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">

          {/* New Task Tab */}
          <TabsContent value="new-task" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <Card className="border-2 border-dashed border-sheraton-gold bg-sheraton-cream">
                <CardContent className="p-12 text-center">
                  <div className="flex justify-center mb-6">
                    <Loader className="h-12 w-12 text-sheraton-gold animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Loading tasks and complaints...</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && (
              <>
                {/* Open Complaints Section */}
                {complaints.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Open Complaints to Convert
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a complaint below to create a task to resolve it
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {complaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className={`p-4 border rounded-lg transition-all ${
                          selectedComplaint?.id === complaint.id
                            ? "border-orange-500 bg-orange-100 shadow-md"
                            : "border-orange-200 hover:border-orange-400"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sheraton-navy">
                            {complaint.complaint_type}
                          </h4>
                          <Badge
                            className={`capitalize ${
                              complaint.priority === "urgent"
                                ? "bg-red-500"
                                : complaint.priority === "high"
                                  ? "bg-orange-500"
                                  : complaint.priority === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-blue-500"
                            }`}
                          >
                            {complaint.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {complaint.description}
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>
                            <strong>Guest:</strong> {complaint.guest_name}
                          </p>
                          <p>
                            <strong>Room:</strong> {complaint.room_number}
                          </p>
                          <p>
                            <strong>Filed:</strong>{" "}
                            {new Date(complaint.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptComplaint(complaint)}
                          disabled={isSubmitting}
                          className="mt-3 w-full bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {selectedComplaint?.id === complaint.id ? "Acknowledged" : "Accept & Acknowledge"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {complaints.length === 0 && (
              <Card className="border-2 border-dashed border-orange-200 bg-orange-50/30">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">No open complaints at this time</p>
                </CardContent>
              </Card>
            )}

            {selectedComplaint && (
              <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-orange-700">
                        <CheckCircle className="h-5 w-5" />
                        Acknowledged Complaint
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        This complaint will be converted to a task below
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedComplaint(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Issue Type</p>
                      <p className="font-semibold text-sheraton-navy">{selectedComplaint.complaint_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Priority</p>
                      <Badge
                        className={`capitalize ${
                          selectedComplaint.priority === "urgent"
                            ? "bg-red-500"
                            : selectedComplaint.priority === "high"
                              ? "bg-orange-500"
                              : selectedComplaint.priority === "medium"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                        }`}
                      >
                        {selectedComplaint.priority}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Guest Name</p>
                    <p className="font-semibold text-sheraton-navy">{selectedComplaint.guest_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Room Number</p>
                      <p className="font-semibold text-sheraton-navy">{selectedComplaint.room_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Filed Date</p>
                      <p className="font-semibold text-sheraton-navy">
                        {new Date(selectedComplaint.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border border-orange-200">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {selectedComplaint.email && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Guest Email</p>
                      <p className="text-sm text-gray-600">{selectedComplaint.email}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card data-task-form>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-sheraton-gold" />
                  Create New Task
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a task and assign it to internal staff or external vendors
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Form Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="task-title">Task Title *</Label>
                      <Input
                        id="task-title"
                        placeholder="e.g., Fix HVAC System"
                        value={formData.title}
                        onChange={(e) => handleFormChange("title", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-desc">Description</Label>
                      <Textarea
                        id="task-desc"
                        placeholder="Detailed task description..."
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleFormChange("description", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priority *</Label>
                        <Select value={formData.priority} onValueChange={(value) => handleFormChange("priority", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleFormChange("category", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Assignment Type *</Label>
                        <Select value={formData.assignmentType} onValueChange={(value) => handleFormChange("assignmentType", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal Staff</SelectItem>
                            <SelectItem value="external">External Vendor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Assign To *</Label>
                        <Select value={formData.assignee} onValueChange={(value) => handleFormChange("assignee", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={formData.assignmentType ? "Select assignee" : "First select assignment type"} />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.assignmentType === "internal" && internalStaff.length > 0 &&
                              internalStaff.map((staff) => (
                                <SelectItem
                                  key={staff.id}
                                  value={`${staff.first_name} ${staff.last_name} - ${staff.service_type}`}
                                >
                                  {staff.first_name} {staff.last_name} ({staff.service_type})
                                </SelectItem>
                              ))
                            }
                            {formData.assignmentType === "external" && externalVendors.length > 0 &&
                              externalVendors.map((vendor) => (
                                <SelectItem
                                  key={vendor.id}
                                  value={`${vendor.first_name} ${vendor.last_name} - ${vendor.service_type}`}
                                >
                                  {vendor.first_name} {vendor.last_name} ({vendor.service_type})
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        {formData.assignmentType === "internal" && internalStaff.length === 0 && (
                          <p className="text-sm text-orange-600">No internal staff available. Create staff profiles first.</p>
                        )}
                        {formData.assignmentType === "external" && externalVendors.length === 0 && (
                          <p className="text-sm text-orange-600">No external vendors available. Create vendor profiles first.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Due Date *</Label>
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => handleFormChange("dueDate", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Estimated Time</Label>
                        <Select value={formData.estimatedTime} onValueChange={(value) => handleFormChange("estimatedTime", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30 min">30 minutes</SelectItem>
                            <SelectItem value="1 hour">1 hour</SelectItem>
                            <SelectItem value="2 hours">2 hours</SelectItem>
                            <SelectItem value="4 hours">4 hours</SelectItem>
                            <SelectItem value="8 hours">8 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Terms (for external vendors)</Label>
                      <Input
                        placeholder="e.g., 50% upfront, balance upon completion"
                        value={formData.paymentTerms}
                        onChange={(e) => handleFormChange("paymentTerms", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Budget Allocation</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500.00"
                        value={formData.budget}
                        onChange={(e) => handleFormChange("budget", e.target.value)}
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        The budget allocated to complete this task
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Attachments & Media</Label>
                      <FileUploadZone
                        attachments={fileAttachments}
                        onAddAttachments={(newAttachments) =>
                          setFileAttachments((prev) => [...prev, ...newAttachments])
                        }
                        onRemoveAttachment={(id) =>
                          setFileAttachments((prev) =>
                            prev.filter((att) => att.id !== id)
                          )
                        }
                        maxFiles={10}
                        maxSizeMB={50}
                      />
                      {selectedComplaint && fileAttachments.length > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          ✓ {fileAttachments.length} attachment(s) from complaint auto-populated
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleCreateTask}
                      disabled={isSubmitting}
                      className="w-full sheraton-gradient text-white hover:opacity-90"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Creating Task..." : "Create & Send Task"}
                    </Button>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    <Card className="bg-gradient-to-br from-sheraton-cream to-white border-sheraton-gold border-2">
                      <CardHeader>
                        <CardTitle className="text-base text-sheraton-navy flex items-center gap-2">
                          <Flag className="h-5 w-5 text-sheraton-gold" />
                          Task Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-4">
                        <div className="p-3 bg-white rounded-lg border-l-4 border-l-sheraton-gold">
                          <p className="font-semibold text-sheraton-navy mb-1">
                            Clear Instructions
                          </p>
                          <p className="text-gray-600 text-xs">
                            Provide detailed descriptions with expected outcomes
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border-l-4 border-l-sheraton-gold">
                          <p className="font-semibold text-sheraton-navy mb-1">
                            Realistic Deadlines
                          </p>
                          <p className="text-gray-600 text-xs">
                            Allow adequate time for quality work
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border-l-4 border-l-sheraton-gold">
                          <p className="font-semibold text-sheraton-navy mb-1">
                            Payment Terms
                          </p>
                          <p className="text-gray-600 text-xs">
                            Be clear about payment schedules for external work
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>

          {/* To do List Tab */}
          <TabsContent value="todo-list" className="space-y-6">
            {userRole === "service_provider" ? (
              // Service Provider View - Show their todos
              <>
                <div className="flex items-center gap-3 mb-4">
                  <CheckSquare className="h-6 w-6 text-sheraton-gold" />
                  <div>
                    <h2 className="text-2xl font-bold text-sheraton-navy">Your Tasks</h2>
                    <p className="text-sm text-gray-600">Tasks you've accepted - manage your workload</p>
                  </div>
                </div>

                {/* Filter by status */}
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40 border-gray-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Todo Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {todoItems
                    .filter((todo) => filterStatus === "all" || todo.status === filterStatus)
                    .map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onStatusChange={() => {
                          // Reload todos
                          if (currentUserProfile) {
                            supabase
                              .from("todo_list")
                              .select("*")
                              .eq("provider_id", currentUserProfile.id)
                              .order("created_at", { ascending: false })
                              .then(({ data }) => setTodoItems(data || []));
                          }
                        }}
                      />
                    ))}
                </div>

                {todoItems.length === 0 && (
                  <Card className="border-2 border-dashed border-sheraton-gold bg-sheraton-cream">
                    <CardContent className="p-12 text-center">
                      <div className="flex justify-center mb-6">
                        <CheckSquare className="h-16 w-16 text-sheraton-gold opacity-40" />
                      </div>
                      <h3 className="text-xl font-semibold text-sheraton-navy mb-2">No tasks yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        When you accept a task, it will appear here for you to manage
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              // Manager View - Show created tasks
              <>
                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 flex gap-2 w-full md:w-auto">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-gray-200"
                      />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-40 border-gray-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 border-l pl-4">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={viewMode === "grid" ? "sheraton-gradient text-white" : ""}
                      title="Grid view"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "sheraton-gradient text-white" : ""}
                      title="List view"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Tasks Display */}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  : "space-y-4"
              }
            >
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`${getStatusColor(task.status)} hover:shadow-lg transition-shadow overflow-hidden`}
                >
                  <CardContent className="p-6">
                    {/* Header with Status and Priority */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-white rounded-lg flex-shrink-0">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold text-sheraton-gold uppercase tracking-wide">
                              {task.id}
                            </p>
                            {(task as any).is_from_complaint && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                From Complaint
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-bold text-sheraton-navy mt-1 line-clamp-2 hover:text-sheraton-gold transition-colors">
                            {task.title}
                          </h3>
                        </div>
                      </div>
                      <Badge className={`${getPriorityColor(task.priority)} font-semibold flex-shrink-0 ml-2`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {task.description}
                    </p>

                    {/* Task Details Grid */}
                    <div className="space-y-3 mb-5 text-sm">
                      {task.category && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">CATEGORY</span>
                          <span className="font-semibold text-gray-900 capitalize">{task.category}</span>
                        </div>
                      )}
                      {task.assignee_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">ASSIGNED TO</span>
                          <span className="font-semibold text-gray-900">{task.assignee_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">DUE DATE</span>
                          <span className="font-semibold text-gray-900">{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.estimated_time && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">EST. TIME</span>
                          <span className="font-semibold text-gray-900">{task.estimated_time}</span>
                        </div>
                      )}
                      {(task as any).budget && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">BUDGET</span>
                          <span className="font-semibold text-green-700">${parseFloat((task as any).budget).toFixed(2)}</span>
                        </div>
                      )}
                      {task.assigned_category && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs font-medium">TYPE</span>
                          <Badge className={task.assigned_category === "internal" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                            {task.assigned_category === "internal" ? "Internal" : "External"}
                          </Badge>
                        </div>
                      )}
                      {taskAttachments.get(task.id) && taskAttachments.get(task.id)!.length > 0 && (
                        <div className="pt-2 border-t mt-3">
                          <AttachmentList
                            attachments={taskAttachments.get(task.id)!}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                      <Badge
                        variant="outline"
                        className="bg-white"
                      >
                        {getStatusLabel(task.status)}
                      </Badge>

                      {/* Show response button if this task is assigned to current service provider */}
                      {userRole === "service_provider" &&
                        task.assigned_to === currentUserProfile?.id &&
                        !taskResponses.find((r) => r.task_id === task.id) && (
                          <Button
                            size="sm"
                            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              setSelectedTaskForResponse(task);
                              setShowResponseModal(true);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Respond
                          </Button>
                        )}

                      {/* Always show chat button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTask(task.id);
                          handleTabChange("live-chat");
                        }}
                        className={`${userRole === "service_provider" && task.assigned_to === currentUserProfile?.id && !taskResponses.find((r) => r.task_id === task.id) ? "" : "ml-auto"} hover:bg-sheraton-gold hover:text-white`}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

                {filteredTasks.length === 0 && (
                  <Card className="col-span-full border-2 border-dashed border-sheraton-gold bg-sheraton-cream">
                    <CardContent className="p-12 text-center">
                      <div className="flex justify-center mb-6">
                        <CheckSquare className="h-16 w-16 text-sheraton-gold opacity-40" />
                      </div>
                      <h3 className="text-xl font-semibold text-sheraton-navy mb-2">No tasks found</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        Try adjusting your search or filters, or create a new task to get started
                      </p>
                      <Button
                        onClick={() => handleTabChange("new-task")}
                        className="sheraton-gradient text-white"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create New Task
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Live Chat Tab */}
          <TabsContent value="live-chat" className="space-y-6">
            {selectedTask ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
                {/* Chat Area */}
                {currentUser && userRole && (
                  <TaskChat
                    taskId={selectedTask}
                    currentUserId={currentUser.id}
                    currentUserRole={userRole as "manager" | "service_provider"}
                    taskStatus={tasks.find((t) => t.id === selectedTask)?.status || ""}
                    otherPartyName={
                      userRole === "manager"
                        ? tasks.find((t) => t.id === selectedTask)?.assignee_name || "Provider"
                        : tasks.find((t) => t.id === selectedTask)?.title || "Manager"
                    }
                  />
                )}

                {/* Task Details Sidebar */}
                <Card className="bg-gradient-to-b from-sheraton-cream to-white border-sheraton-gold">
                  <CardHeader>
                    <CardTitle className="text-sheraton-navy">Task Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 text-sm">
                    {tasks.find((t) => t.id === selectedTask) && (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ID</p>
                          <p className="font-semibold text-sheraton-navy font-mono">
                            {tasks.find((t) => t.id === selectedTask)?.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Priority</p>
                          <Badge
                            className={`${getPriorityColor(
                              tasks.find((t) => t.id === selectedTask)?.priority || ""
                            )} font-semibold`}
                          >
                            {tasks.find((t) => t.id === selectedTask)?.priority
                              .charAt(0)
                              .toUpperCase() +
                              tasks.find((t) => t.id === selectedTask)?.priority.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assigned To</p>
                          <p className="font-semibold text-sheraton-navy">
                            {tasks.find((t) => t.id === selectedTask)?.assignedTo}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Due Date</p>
                          <p className="font-semibold text-sheraton-navy">
                            {tasks.find((t) => t.id === selectedTask)?.dueDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                          <Badge variant="outline" className="bg-white">
                            {tasks.find((t) => t.id === selectedTask)?.status
                              .split("-")
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ")}
                          </Badge>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-2 border-dashed border-sheraton-gold bg-sheraton-cream">
                <CardContent className="p-12 text-center">
                  <div className="flex justify-center mb-6">
                    <MessageSquare className="h-16 w-16 text-sheraton-gold opacity-40" />
                  </div>
                  <h3 className="text-xl font-semibold text-sheraton-navy mb-2">
                    Select a task to view chat
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Click "Chat" on any task from the Task List tab to start or view conversations
                  </p>
                  <Button
                    onClick={() => handleTabChange("todo-list")}
                    className="sheraton-gradient text-white"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Go to Task List
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TasksPage;
