"use client";

import React, { useMemo, useState } from "react";
import { useDatabaseQuery, useDatabaseMutation } from "../../../hooks/useDatabase";
// @ts-nocheck
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
 
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  MapPin,
  List,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Users as UsersIcon,
  Filter,
  Loader,
} from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Types for user data
interface UserWithStats {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: "citizen" | "admin" | "department";
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  createdAt: number;
  stats?: {
    totalIssues: number;
    pendingIssues: number;
    resolvedIssues: number;
  };
}
type ColumnKey =
  | "user"
  | "role"
  | "email"
  | "phone"
  | "location"
  | "totalIssues"
  | "pendingIssues"
  | "resolvedIssues"
  | "joinedOn";

  type ColumnVisibility = Record<ColumnKey, boolean>;
export default function UsersPage() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    user: true,
    role: true,
    email: true,
    phone: true,
    location: true,
    totalIssues: true,
    pendingIssues: true,
    resolvedIssues: true,
    joinedOn: true,
  });

  // Data queries
  const allUsers = useDatabaseQuery("users") as any[];
  const allIssues = useDatabaseQuery("wasteReports") as any[];
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Combine user data with issue stats
  const usersWithStats = useMemo(() => {
    if (!allUsers || !allIssues) return null;

    return allUsers.map((u) => {
      const userIssues = allIssues.filter(
        (issue) => issue.reportedBy === u._id
      );
      const stats = {
        totalIssues: userIssues.length,
        pendingIssues: userIssues.filter(
          (issue) => issue.status === "pending"
        ).length,
        resolvedIssues: userIssues.filter(
          (issue) => issue.status === "resolved"
        ).length,
      };
      return { ...u, stats };
    });
  }, [allUsers, allIssues]);

  // Filter and sort the user data
  const filteredUsers = useMemo(() => {
    if (!usersWithStats) return [];

    const filtered = usersWithStats.filter((u) => {
      const matchesSearch =
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [usersWithStats, searchTerm, filterRole]);

  // Loading and permission checks
  if (allUsers === undefined || allIssues === undefined || currentAdminUser === undefined) {
    return (
     <div className="h-full w-full flex items-center justify-center py-8">
        <Loader size={20} className="animate-spin text-green-500" /> 
      </div>
    );
  }

  if (currentAdminUser === null || currentAdminUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">Access Denied</div>
          <p className="text-muted-foreground">
            You don't have admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage and view all registered users of the platform.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-auto flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="citizen">Citizen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Column Visibility Toggle */}
      <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <UsersIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Columns</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {(
        Object.entries(columnVisibility) as [ColumnKey, boolean][]
      ).map(([key, isVisible]) => (
        <DropdownMenuCheckboxItem
          key={key}
          className="capitalize"
          checked={isVisible}
          onCheckedChange={() =>
            setColumnVisibility((prev) => ({
              ...prev,
              [key]: !prev[key], // ✅ no more error
            }))
          }
        >
          {key.replace(/([A-Z])/g, " $1")}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A comprehensive list of all platform users.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive custom-scrollbar px-3">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  {columnVisibility.user && <TableHead className="w-[200px] py-4">User</TableHead>}
                  {columnVisibility.role && <TableHead className="w-[120px] py-4">Role</TableHead>}
                  {columnVisibility.email && <TableHead className="w-[200px] py-4">Email</TableHead>}
                  {columnVisibility.phone && <TableHead className="w-[150px] py-4">Phone</TableHead>}
                  {columnVisibility.location && <TableHead className="w-[250px] py-4">Location</TableHead>}
                  {columnVisibility.totalIssues && <TableHead className="py-4">Issues</TableHead>}
                  {columnVisibility.pendingIssues && <TableHead className="py-4">Pending</TableHead>}
                  {columnVisibility.resolvedIssues && <TableHead className="py-4">Resolved</TableHead>}
                  {columnVisibility.joinedOn && <TableHead className="w-[120px] py-4">Joined On</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <UsersIcon className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No users found matching your search.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
                    <TableRow key={u._id} className="border-border/30 hover:bg-accent/30 transition-colors">
                      {columnVisibility.user && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.imageUrl || "/default-avatar.png"}
                              alt={u.firstName || "User"}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">
                                {u.firstName} {u.lastName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.role && (
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={
                              u.role === "admin"
                                ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                : u.role === "department"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                            }
                          >
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </Badge>
                        </TableCell>
                      )}
                      {columnVisibility.email && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{u.email}</span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.phone && (
                        <TableCell className="py-4">
                          {u.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.location && (
                        <TableCell className="py-4">
                          {u.city && u.district ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {u.city}, {u.district}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.totalIssues && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <List className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {u.stats?.totalIssues || 0}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.pendingIssues && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-yellow-500 text-sm">
                              {u.stats?.pendingIssues || 0}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.resolvedIssues && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-green-500 text-sm">
                              {u.stats?.resolvedIssues || 0}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.joinedOn && (
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}