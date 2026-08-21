"use client";

import React, { useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  User,
  Calendar,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Department {
  _id: string;
  name: string;
  description: string;
  headOfDepartment?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

// Memoized DepartmentForm Component
const DepartmentForm = React.memo(
  ({
    onSubmit,
    isEdit = false,
    formData,
    onFormChange,
    onCancel,
  }: {
    onSubmit: (e: React.FormEvent) => void;
    isEdit?: boolean;
    formData: any;
    onFormChange: (key: string, value: string) => void;
    onCancel: () => void;
  }) => {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Public Works Department"
              value={formData.name}
              onChange={(e) => onFormChange("name", e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Head of Department */}
          <div className="space-y-2">
            <Label htmlFor="headOfDepartment">Head of Department</Label>
            <Input
              id="headOfDepartment"
              placeholder="e.g. John Smith"
              value={formData.headOfDepartment}
              onChange={(e) => onFormChange("headOfDepartment", e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the department's responsibilities..."
            value={formData.description}
            onChange={(e) => onFormChange("description", e.target.value)}
            required
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="department@example.com"
              value={formData.contactEmail}
              onChange={(e) => onFormChange("contactEmail", e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.contactPhone}
              onChange={(e) => onFormChange("contactPhone", e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isEdit ? "Update Department" : "Create Department"}
          </Button>
        </DialogFooter>
      </form>
    );
  }
);

export default function DepartmentsPage() {
  const { user } = useUser();

  // State for forms and dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headOfDepartment: "",
    contactEmail: "",
    contactPhone: "",
  });

  // Data queries
  const departments = useDatabaseQuery("departments") as any[];
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;
  const issues = useDatabaseQuery("wasteReports") as any[];

  // Mutations
  const { mutate: createDepartment } = useDatabaseMutation("departments");
  const { mutate: updateDepartment } = useDatabaseMutation("departments");
  const { mutate: deleteDepartment } = useDatabaseMutation("departments");

  // New: Memoize the form change handler
  const handleFormChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // New: Memoize the reset form handler
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      headOfDepartment: "",
      contactEmail: "",
      contactPhone: "",
    });
    setEditingDepartment(null);
  }, []);

  // Get department statistics
  const departmentStats = departments?.map((dept) => {
    const assignedIssues =
      issues?.filter((issue) => issue.assignedToDepartment === dept._id) || [];
    const resolvedIssues = assignedIssues.filter(
      (issue) => issue.status === "resolved"
    );
    const pendingIssues = assignedIssues.filter(
      (issue) => issue.status === "pending"
    );

    return {
      ...dept,
      totalIssues: assignedIssues.length,
      resolvedIssues: resolvedIssues.length,
      pendingIssues: pendingIssues.length,
      resolutionRate:
        assignedIssues.length > 0
          ? Math.round((resolvedIssues.length / assignedIssues.length) * 100)
          : 0,
    };
  });

  // Form handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAdminUser?._id) {
      toast.error("Admin user not found. Please refresh and try again.");
      return;
    }

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Department name and description are required");
      return;
    }

    try {
      await createDepartment({
        name: formData.name.trim(),
        description: formData.description.trim(),
        headOfDepartment: formData.headOfDepartment.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
      });

      toast.success("Department created successfully");
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error("Department creation error:", error);
      toast.error("Failed to create department");
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description,
      headOfDepartment: department.headOfDepartment || "",
      contactEmail: department.contactEmail || "",
      contactPhone: department.contactPhone || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDepartment) return;

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Department name and description are required");
      return;
    }

    try {
      await updateDepartment({
        departmentId: editingDepartment._id as any,
        name: formData.name.trim(),
        description: formData.description.trim(),
        headOfDepartment: formData.headOfDepartment.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
      });

      toast.success("Department updated successfully");
      setShowEditDialog(false);
      setEditingDepartment(null);
      resetForm();
    } catch (error) {
      console.error("Department update error:", error);
      toast.error("Failed to update department");
    }
  };

  const handleDelete = async (departmentId: string) => {
    try {
      await deleteDepartment({
        departmentId: departmentId as any,
      });

      toast.success("Department deleted successfully");
    } catch (error) {
      console.error("Department deletion error:", error);
      toast.error("Failed to delete department");
    }
  };

  const toggleStatus = async (department: Department) => {
    try {
      await updateDepartment({
        departmentId: department._id as any,
        isActive: !department.isActive,
      });

      toast.success(
        `Department ${!department.isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Department status update error:", error);
      toast.error("Failed to update department status");
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    resetForm();
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    resetForm();
  };

  // Loading and permission checks
  if (!departments || !currentAdminUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentAdminUser.role !== "admin") {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Departments Management
          </h1>
          <p className="text-muted-foreground">
            Manage municipal departments and their responsibilities
          </p>
        </div>

        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              resetForm();
            }
          }}
          modal={false}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new municipal department to handle civic issues
              </DialogDescription>
            </DialogHeader>
            <DepartmentForm
              onSubmit={handleCreate}
              formData={formData}
              onFormChange={handleFormChange}
              onCancel={handleCancelCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Departments
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              {departments.filter((d) => d.isActive).length} active departments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Issues Assigned
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departmentStats?.reduce(
                (sum, dept) => sum + dept.totalIssues,
                0
              ) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Resolution Rate
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {departmentStats && departmentStats.length > 0
                ? Math.round(
                    departmentStats.reduce(
                      (sum, dept) => sum + dept.resolutionRate,
                      0
                    ) / departmentStats.length
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Issues resolved successfully
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Issues
            </CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {departmentStats?.reduce(
                (sum, dept) => sum + dept.pendingIssues,
                0
              ) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting department action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>
            Manage and monitor all municipal departments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-3">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-[250px] py-4">
                    Department Details
                  </TableHead>
                  <TableHead className="w-[150px] py-4">
                    Head of Department
                  </TableHead>
                  <TableHead className="w-[200px] py-4">
                    Contact Information
                  </TableHead>
                  <TableHead className="w-[120px] py-4">Status</TableHead>
                  <TableHead className="w-[120px] py-4">Created Date</TableHead>
                  <TableHead className="text-right w-[150px] py-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Building className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No departments created yet
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          Create First Department
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  departmentStats?.map((department) => (
                    <TableRow
                      key={department._id}
                      className="border-border/30 hover:bg-accent/30 transition-colors"
                    >
                      {/* Department Details */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">
                            {department.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {department.description}
                          </p>
                        </div>
                      </TableCell>

                      {/* Head of Department */}
                      <TableCell className="py-4">
                        {department.headOfDepartment ? (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {department.headOfDepartment}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </TableCell>

                      {/* Contact Information */}
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          {department.contactEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">
                                {department.contactEmail}
                              </span>
                            </div>
                          )}
                          {department.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">
                                {department.contactPhone}
                              </span>
                            </div>
                          )}
                          {!department.contactEmail &&
                            !department.contactPhone && (
                              <span className="text-xs text-muted-foreground">
                                No contact info
                              </span>
                            )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={
                            department.isActive
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {department.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Performance */}

                      {/* Created Date */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">
                            {new Date(
                              department.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(department)}
                            className="text-xs"
                          >
                            {department.isActive ? "Deactivate" : "Activate"}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Department
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {department.name}"? This action cannot be
                                  undone. All issues assigned to this department
                                  will be unassigned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(department._id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete Department
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            resetForm();
          }
        }}
        modal={false}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information and contact details
            </DialogDescription>
          </DialogHeader>
          <DepartmentForm
            onSubmit={handleUpdate}
            isEdit={true}
            formData={formData}
            onFormChange={handleFormChange}
            onCancel={handleCancelEdit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
