"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { useDatabaseQuery } from "../../hooks/useDatabase";
// @ts-nocheck
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AlertCircle,
  Users,
  Building,
  BarChart3,
  Settings,
  Plus,
  Bell,
  FileText,
  MapPin,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function SidebarItem({ href, icon, label, badge, isActive, isCollapsed }: SidebarItemProps) {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-12 transition-all duration-200",
          isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-accent",
          isCollapsed && "px-3"
        )}
        title={isCollapsed ? label : undefined}
      >
        {icon}
        {!isCollapsed && (
          <>
            <span>{label}</span>
            {badge && (
              <Badge variant="secondary" className="ml-auto">
                {badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const convexUserArr = useDatabaseQuery("users") as any[];
  const convexUser = convexUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  const issues = useDatabaseQuery("wasteReports") as any[];
  const departments = useDatabaseQuery("departments") as any[];
  const pendingCount = issues?.filter(issue => issue.status === 'pending').length || 0;
  const users = useDatabaseQuery("users") as any[];
  const totalUsers = users?.length || 0;
  const totalDepartments = departments?.length || 0;

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    redirect("/");
  }

  // Show loading while user data is being fetched
  if (convexUser === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show access denied immediately if user is not admin (no redirect to prevent loop)
  if (convexUser && convexUser.role !== "admin" && convexUser.role !== "department") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl font-semibold">Access Denied</div>
          <p className="text-muted-foreground max-w-md">
            You don't have sufficient privileges to access the admin panel.
            Please contact your administrator if you believe this is an error.
          </p>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    {
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      isActive: pathname === "/admin"
    },
    {
      href: "/admin/map",
      icon: <MapPin className="h-5 w-5" />,
      label: "Map View",
      isActive: pathname.startsWith("/admin/map")
    },
    {
      href: "/admin/waste-reports",
      icon: <AlertCircle className="h-5 w-5" />,
      label: "Waste Reports",
      badge: pendingCount > 0 ? pendingCount.toString() : undefined,
      isActive: pathname.startsWith("/admin/waste-reports")
    },
    {
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      label: "Users",
      badge: totalUsers > 0 ? totalUsers.toString() : undefined,
      isActive: pathname.startsWith("/admin/users")
    },
    {
      href: "/admin/departments",
      icon: <Building className="h-5 w-5" />,
      label: "Departments",
      badge: totalDepartments > 0 ? totalDepartments.toString() : undefined,
      isActive: pathname.startsWith("/admin/departments")
    },
    {
      href: "/admin/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Analytics",
      isActive: pathname.startsWith("/admin/analytics")
    },
    {
      href: "/admin/reports",
      icon: <FileText className="h-5 w-5" />,
      label: "Reports",
      isActive: pathname.startsWith("/admin/reports")
    }
  ];

  const quickActions = [
 
    {
      href: "/admin/departments/new",
      icon: <Building className="h-4 w-4" />,
      label: "Add Department"
    },
   
  ];

  const sidebarContent = (isCollapsed?: boolean) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className={cn("flex items-center gap-2 p-4 border-b border-border", isCollapsed && "justify-center")}>
        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-md" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Shuchithvam Admin</h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-2">
          {sidebarItems.map((item) => (
            <SidebarItem key={item.href} {...item} isCollapsed={isCollapsed} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 pt-4 border-t border-border">
          {!isCollapsed && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
          )}
          <div className="space-y-1">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Button 
                  variant="ghost" 
                  size={isCollapsed ? "icon" : "sm"} 
                  className={cn(
                    "transition-all duration-200",
                    isCollapsed ? "w-full h-10" : "w-full justify-start gap-2 h-9"
                  )}
                  title={isCollapsed ? action.label : undefined}
                >
                  {action.icon}
                  {!isCollapsed && <span className="text-sm">{action.label}</span>}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      {/* Settings */}
      <div className="p-4 border-t border-border">
        <Link href="/admin/settings">
          <Button
            variant={pathname === "/admin/settings" ? "secondary" : "ghost"}
            className={cn(
              "transition-all duration-200",
              isCollapsed ? "w-full h-10 px-3" : "w-full justify-start gap-3 h-12"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5" />
            {!isCollapsed && <span>Settings</span>}
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {sidebarContent(false)}
              </SheetContent>
            </Sheet>

            {/* Desktop sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            {/* Logo for mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center">
                <img src="/logo.png" alt="" className="h-6 w-6 rounded-md" />
              </div>
              <span className="font-bold">Shuchithvam</span>
            </div>

            {/* System status indicator */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live System</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">System Administrator</p>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
              afterSignOutUrl="/"
            />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <div 
          className={cn(
            "hidden md:flex flex-col border-r border-border bg-card/50 transition-all duration-300",
            sidebarCollapsed ? "w-16" : "w-72"
          )}
        >
          {sidebarContent(sidebarCollapsed)}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
