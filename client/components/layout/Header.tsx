import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Crown,
  Hotel,
  Menu,
  User,
  Calendar,
  Utensils,
  Briefcase,
  MapPin,
  ShoppingBag,
  Users,
  Settings,
  Bell,
  Heart,
  CheckSquare,
  BarChart3,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase, Notification } from "../../lib/supabase";
import { toast } from "../../hooks/use-toast";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Load notifications for current user
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => !n.is_read).length);

        // Subscribe to real-time notifications
        const subscription = supabase
          .channel(`notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification;
              setNotifications((prev) => [newNotification, ...prev]);
              setUnreadCount((prev) => prev + 1);
              // Show toast for new notification
              toast({
                title: "New Notification",
                description: newNotification.message,
                duration: 4,
              });
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = initNotifications();

    return () => {
      unsubscribe.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const guestNavItems = [
    {
      title: "Stay",
      items: [
        {
          title: "Book a Room",
          href: "/book",
          icon: Hotel,
          description: "Luxury accommodations await",
        },
        {
          title: "Special Offers",
          href: "/offers",
          icon: Crown,
          description: "Exclusive deals for special guests",
        },
        {
          title: "Spa & Wellness",
          href: "/spa",
          icon: Heart,
          description: "Rejuvenate your body and soul",
        },
        {
          title: "Fitness Center",
          href: "/fitness",
          icon: Users,
          description: "State-of-the-art facilities",
        },
      ],
    },
    {
      title: "Dine",
      items: [
        {
          title: "Digital Menu",
          href: "/menu",
          icon: Utensils,
          description: "Interactive dining experience",
        },
        {
          title: "Room Service",
          href: "/room-service",
          icon: Bell,
          description: "24/7 luxury dining",
        },
        {
          title: "Events & Banquets",
          href: "/events",
          icon: Calendar,
          description: "Memorable celebrations",
        },
      ],
    },
    {
      title: "Experience",
      items: [
        {
          title: "Travel Desk",
          href: "/travel",
          icon: MapPin,
          description: "Curated local experiences",
        },
        {
          title: "Concierge",
          href: "/concierge",
          icon: Settings,
          description: "Personalized assistance",
        },
        {
          title: "Gift Shop",
          href: "/shop",
          icon: ShoppingBag,
          description: "Luxury souvenirs & more",
        },
        {
          title: "Special Community",
          href: "/blog",
          icon: Users,
          description: "Exclusive member experiences",
        },
      ],
    },
  ];

  const staffNavItems = [
    {
      title: "Tasks",
      items: [
        {
          title: "New Task",
          href: "/tasks/new",
          icon: Calendar,
          description: "Create and allocate new tasks",
        },
        {
          title: "To do List",
          href: "/tasks/list",
          icon: Briefcase,
          description: "Manage and track assigned tasks",
        },
        {
          title: "Live Chat",
          href: "/tasks/chat",
          icon: Bell,
          description: "Communicate about tasks",
        },
      ],
    },
    {
      title: "Reports",
      items: [
        {
          title: "Task Reports",
          href: "/reports/tasks",
          icon: Settings,
          description: "View task completion reports",
        },
        {
          title: "Staff Performance",
          href: "/reports/performance",
          icon: Users,
          description: "Staff productivity analytics",
        },
        {
          title: "Vendor Reports",
          href: "/reports/vendors",
          icon: Briefcase,
          description: "Contractor performance metrics",
        },
      ],
    },
    {
      title: "Accounts",
      items: [
        {
          title: "Vendors",
          href: "/accounts/vendors",
          icon: Users,
          description: "Manage contractors and vendors",
        },
        {
          title: "Quotes",
          href: "/accounts/quotes",
          icon: Settings,
          description: "Create and manage quotes",
        },
        {
          title: "Billing",
          href: "/accounts/billing",
          icon: Briefcase,
          description: "Invoices and payment tracking",
        },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Crown className="h-8 w-8 text-sheraton-gold" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-sheraton-navy">
                Sheraton
              </span>
              <span className="text-xs text-sheraton-gold font-medium tracking-wide">
                SPECIAL
              </span>
            </div>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              {[...guestNavItems, ...staffNavItems].map((section) => (
                <NavigationMenuItem key={section.title}>
                  <NavigationMenuTrigger className="text-foreground/60 hover:text-foreground">
                    {section.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex h-full w-full select-none flex-col justify-end rounded-md sheraton-gradient p-6 no-underline outline-none focus:shadow-md"
                            to="/"
                          >
                            <Crown className="h-6 w-6 text-white" />
                            <div className="mb-2 mt-4 text-lg font-medium text-white">
                              {section.title === "Stay"
                                ? "Luxury Awaits"
                                : section.title === "Dine"
                                  ? "Culinary Excellence"
                                  : section.title === "Experience"
                                    ? "Special Moments"
                                    : section.title === "Tasks"
                                      ? "Task Management"
                                      : section.title === "Reports"
                                        ? "Analytics & Reports"
                                        : "Account Management"}
                            </div>
                            <p className="text-sm leading-tight text-white/90">
                              {section.title === "Stay"
                                ? "Experience unparalleled comfort and luxury"
                                : section.title === "Dine"
                                  ? "Savor exceptional flavors and hospitality"
                                  : section.title === "Experience"
                                    ? "Create unforgettable memories"
                                    : section.title === "Tasks"
                                      ? "Create and manage work tasks"
                                      : section.title === "Reports"
                                        ? "Track performance and analytics"
                                        : "Manage vendors and billing"}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {section.items.map((item) => (
                        <li key={item.title}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.href}
                              className={cn(
                                "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                isActive(item.href) &&
                                  "bg-accent text-accent-foreground",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-sheraton-gold" />
                                <div className="text-sm font-medium leading-none">
                                  {item.title}
                                </div>
                              </div>
                              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                {item.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={() => setIsOpen(false)}
            >
              <Crown className="h-6 w-6 text-sheraton-gold" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-sheraton-navy">
                  Sheraton
                </span>
                <span className="text-xs text-sheraton-gold font-medium tracking-wide">
                  SPECIAL
                </span>
              </div>
            </Link>
            <nav className="flex flex-col space-y-3 mt-6">
              {[...guestNavItems, ...staffNavItems]
                .flatMap((section) => section.items)
                .map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive(item.href) && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="h-4 w-4 text-sheraton-gold" />
                    {item.title}
                  </Link>
                ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            {/* Notification Bell */}
            <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative text-xs">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>

                  {loading ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            notification.is_read
                              ? "bg-background border-border"
                              : "bg-blue-50 border-blue-200"
                          )}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-1">
                              {notification.type === "complaint_filed" ? (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              ) : notification.type === "complaint_acknowledged" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {notification.type === "complaint_filed"
                                  ? "New Complaint"
                                  : notification.type === "complaint_acknowledged"
                                    ? "Complaint Acknowledged"
                                    : notification.type === "task_assigned"
                                      ? "Task Assigned"
                                      : "Task Update"}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.created_at).toLocaleDateString()} at{" "}
                                {new Date(notification.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Link to="/staff">
              <Button variant="ghost" size="sm" className="text-xs">
                <Briefcase className="h-4 w-4 mr-1" />
                Staff Portal
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="ghost" size="sm" className="text-xs">
                Join Special
              </Button>
            </Link>
            <Link to="/profile">
              <Button
                variant="outline"
                size="sm"
                className="sheraton-gradient text-white border-0"
              >
                <User className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">My Account</span>
                <Badge
                  variant="secondary"
                  className="ml-2 bg-white/20 text-white"
                >
                  1,250 pts
                </Badge>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
