import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Bell, Sun, Moon, Menu, HelpCircle } from "lucide-react";
import LOGO from "../../../favicon.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await axios.get("/api/notifications");
      return response.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await axios.put(`/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await axios.put("/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const getInitials = () => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const formatMessage = (message: string) => {
    try {
      const match = message.match(/\[(.*?)\]/); // Extract JSON array
      if (match) {
        const parsedArray = JSON.parse(match[0]); // match[0] includes brackets
        return `You have been granted access to: ${parsedArray.join(", ")}`;
      }
      return message;
    } catch (error) {
      return message; // fallback if parsing fails
    }
  };
  // const openUserGuide = () => {
  //   const userGuideUrl = import.meta.env.VITE_USER_GUIDE_URL;
  //   window.open(userGuideUrl, "_blank");
  // };


  const openUserGuide = () => {
    const userGuideUrl = "../../../../../user_guide.pdf";
    window.open(userGuideUrl, "_blank");
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-2"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        <div className="flex items-center">
          <Link
            href="/"
            className="flex-shrink-0 flex items-center ml-0 lg:ml-0"
          >
            <img
              src="../../../alten_black.png"
              className="mt-1 mr-2 ml-[-30px] dark:hidden"
              title="Alten Global Technologies Private Limited"
              alt="Alten Global Technologies Private Limited"
              width="130"
            />
            <img
              src="../../../alten_W.png"
              className="mt-1 mr-2 ml-[-30px] hidden dark:block"
              title="Alten Global Technologies Private Limited"
              alt="Alten Global Technologies Private Limited"
              width="130"
            />

            <span className="hidden sm:inline font-bold text-xl text-slate-900 dark:text-white">
              Learning Labs
            </span>

          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {/* Dark mode toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
                )}
                <span className="sr-only">View notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex justify-between items-center">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs"
                  >
                    Mark all as read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-72 overflow-y-auto overflow-x-hidden break-words py-1">
                {notifications.length === 0 ? (
                  <div className="py-2 px-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`py-2 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${!notification.isRead
                        ? "bg-slate-50 dark:bg-slate-900"
                        : ""
                        }`}
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-500">
                        {formatMessage(notification.message)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={openUserGuide} title="User Guide">
            <HelpCircle className="h-5 w-5 text-slate-600 hover:text-blue-600 cursor-pointer" />
          </button>
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative rounded-full h-8 w-8 p-0 overflow-hidden"
              >
                <Avatar>
                  <AvatarImage
                    src={user?.profilePicture}
                    alt={user?.username || "User"}
                  />
                  <AvatarFallback className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.username || "User"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/system-settings">System Settings</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
}

export default Header;
