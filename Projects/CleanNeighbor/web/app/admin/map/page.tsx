"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDatabaseQuery } from "../../../hooks/useDatabase";
import { Input } from "@/components/ui/input";
// @ts-nocheck
import { MapPin, Filter, Search, Eye, Loader } from "lucide-react";
import Link from "next/link";

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location: {
    address: string;
    city: string;
    district: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  createdAt: number;
  reporter?: {
    firstName: string;
    lastName: string;
  };
}

// Dynamically import map components
const DynamicMap = React.lazy(() => import('./MapComponent'));

export default function AdminMapView() {
  const { user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data queries
  const issues = useDatabaseQuery("wasteReports") as any[];
  const departments = useDatabaseQuery("departments") as any[];
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Filter issues based on search and filters
  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    
    return issues.filter((issue) => {
      // Only show issues with coordinates
      if (!issue.location?.coordinates) return false;
      
      // Category filter
      if (selectedCategory !== "all" && issue.category !== selectedCategory) {
        return false;
      }
      
      // Status filter
      if (selectedStatus !== "all" && issue.status !== selectedStatus) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          issue.title?.toLowerCase().includes(searchLower) ||
          issue.description?.toLowerCase().includes(searchLower) ||
          issue.location?.address?.toLowerCase().includes(searchLower) ||
          issue.location?.city?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [issues, selectedCategory, selectedStatus, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'acknowledged': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'in_progress': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-700 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500/10 text-green-700';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700';
      case 'high': return 'bg-orange-500/10 text-orange-700';
      case 'urgent': return 'bg-red-500/10 text-red-700';
      default: return 'bg-gray-500/10 text-gray-700';
    }
  };

  // Show loading state
  if (currentAdminUser === undefined || issues === undefined) {
    return (
      <div className="h-full w-full flex items-center justify-center py-8">
        <Loader size={20} className="animate-spin text-green-500" /> 
      </div>
    );
  }

  // Check if user has admin access
  if (currentAdminUser === null || (currentAdminUser.role !== 'admin' && currentAdminUser.role !== 'department')) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">Access Denied</div>
          <p className="text-muted-foreground">
            You don't have sufficient privileges to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (!issues) {
    return (
      <div className="h-full w-full flex items-center justify-center py-8">
        <Loader size={20} className="animate-spin text-green-500" /> 
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Issues Map View</h1>
        <p className="text-muted-foreground">
          Geographic visualization of all reported civic issues
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="Roads">Roads</SelectItem>
                  <SelectItem value="Water Supply">Water Supply</SelectItem>
                  <SelectItem value="Sanitation">Sanitation</SelectItem>
                  <SelectItem value="Electricity">Electricity</SelectItem>
                  <SelectItem value="Public Transport">Public Transport</SelectItem>
                  <SelectItem value="Parks & Recreation">Parks & Recreation</SelectItem>
                  <SelectItem value="Waste Management">Waste Management</SelectItem>
                  <SelectItem value="Street Lighting">Street Lighting</SelectItem>
                  <SelectItem value="Drainage">Drainage</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredIssues.length} issues on map
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Issues Location Map
          </CardTitle>
          <CardDescription>
            Click on markers to view issue details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
            <React.Suspense 
              fallback={
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader className="h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              }
            >
              <DynamicMap issues={filteredIssues as any} />
            </React.Suspense>
          </div>
        </CardContent>
      </Card>

      {/* Issue List as Fallback */}
      <Card>
        <CardHeader>
          <CardTitle>Issues with Location Data</CardTitle>
          <CardDescription>
            All issues that have GPS coordinates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredIssues.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No issues found with the current filters.
              </p>
            ) : (
              filteredIssues.map((issue) => (
                <div key={issue._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{issue.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {issue.location.address}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={getStatusColor(issue.status)}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                        {issue.priority}
                      </Badge>
                      <Badge variant="secondary">{issue.category}</Badge>
                    </div>
                  </div>
                  <Link href={`/admin/waste-reports/${issue._id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredIssues.filter(i => i.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending Issues</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {filteredIssues.filter(i => i.status === 'acknowledged').length}
            </div>
            <p className="text-xs text-muted-foreground">Acknowledged</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {filteredIssues.filter(i => i.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredIssues.filter(i => i.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {filteredIssues.filter(i => i.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}