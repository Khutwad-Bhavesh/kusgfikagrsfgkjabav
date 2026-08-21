"use client";

import React, { useState } from "react";
import { useDatabaseQuery, useDatabaseMutation } from "../../../../hooks/useDatabase";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building } from "lucide-react";

export default function CreateDepartment() {
  const { user } = useUser();

  // State for the form data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headOfDepartment: "",
    contactEmail: "",
    contactPhone: "",
  });

  // Loading state for the form
  const [isLoading, setIsLoading] = useState(false);

  // Convex mutations
  const { mutate: createDepartment } = useDatabaseMutation("departments");
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Form handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Form submission handler
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

    setIsLoading(true);

    try {
      await createDepartment({
        name: formData.name.trim(),
        description: formData.description.trim(),
        headOfDepartment: formData.headOfDepartment.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
      });

      toast.success("Department created successfully");
      setFormData({
        name: "",
        description: "",
        headOfDepartment: "",
        contactEmail: "",
        contactPhone: "",
      });
    } catch (error) {
      console.error("Department creation error:", error);
      toast.error("Failed to create department");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Loading and permission checks
  if (!currentAdminUser) {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Department
        </h1>
        <p className="text-muted-foreground">
          Fill out the form to add a new municipal department
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            New Department Details
          </CardTitle>
          <CardDescription>
            Provide the name, description, and contact information for the new department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Public Works Department"
                  value={formData.name}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  autoComplete="off"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Department"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}