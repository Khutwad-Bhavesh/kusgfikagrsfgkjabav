"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useDatabaseQuery, useDatabaseDoc, useDatabaseMutation } from "../../../../hooks/useDatabase";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  XCircle,
  MessageCircle,
  Image as ImageIcon,
  ArrowUp,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from 'date-fns';
// Removed Convex Id import
import { Label } from "@/components/ui/label";

export default function IssueDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<
    "pending" | "acknowledged" | "in_progress" | "resolved" | "rejected"
  >();
  const [selectedDepartment, setSelectedDepartment] = useState<Id<"departments"> | null>(null);

  const issue = useDatabaseDoc("wasteReports", typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined);
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;
  const departments = useDatabaseQuery("departments") as any[];

  // Mutations
  const { mutate: addComment } = useDatabaseMutation("comments");
  const { mutate: updateIssueStatus } = useDatabaseMutation("wasteReports");
  const { mutate: assignIssueToDepartment } = useDatabaseMutation("wasteReports");
  const { mutate: incrementViewCount } = useDatabaseMutation("wasteReports");
  const { mutate: toggleUpvote } = useDatabaseMutation("wasteReports");
  
  // Increment view count on first load
  useEffect(() => {
    if (issue && user && id) {
      // Assuming you have a mutation to increment view count
      // This should be done on the server, but for simplicity, we'll do it here.
      incrementViewCount({ issueId: id as Id<"wasteReports"> });
    }
  }, [issue, user, id, incrementViewCount]);

  // Set initial status for select
  useEffect(() => {
    if (issue) {
      setNewStatus(issue.status);
      if (issue.assignedToDepartment) {
        setSelectedDepartment(issue.assignedToDepartment as Id<"departments">);
      }
    }
  }, [issue]);

  // Handlers
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }
    if (!currentAdminUser?._id || !issue) {
      toast.error("User or issue not found.");
      return;
    }

    setIsLoading(true);
    try {
      await addComment({
        issueId: issue._id,
        userId: currentAdminUser._id,
        content: newComment,
        isOfficial: currentAdminUser.role !== "citizen",
      });
      setNewComment("");
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === issue?.status) {
      toast.info("Status is already up to date.");
      return;
    }
    if (!currentAdminUser?._id || !issue) {
      toast.error("User or issue not found.");
      return;
    }

    try {
      await updateIssueStatus({
        issueId: issue._id,
        status: newStatus,
      });
      toast.success(`Issue status updated to ${newStatus}.`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status.");
    }
  };
  
  const handleDepartmentAssignment = async () => {
    if (!selectedDepartment || selectedDepartment === issue?.assignedToDepartment) {
      toast.info("Department is already assigned.");
      return;
    }
    if (!currentAdminUser?._id || !issue) {
      toast.error("User or issue not found.");
      return;
    }
    
    try {
      await assignIssueToDepartment({
        issueId: issue._id,
        departmentId: selectedDepartment,
      });
      toast.success("Issue assigned to department successfully!");
    } catch (error) {
      console.error("Failed to assign department:", error);
      toast.error("Failed to assign department.");
    }
  };

  const handleToggleUpvote = async () => {
    if (!currentAdminUser?._id || !issue) return;
    try {
      await toggleUpvote({
        issueId: issue._id,
        userId: currentAdminUser._id,
      });
      toast.success("Upvote updated!");
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
      toast.error("Failed to toggle upvote.");
    }
  };

  // Helper functions for UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'acknowledged': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'urgent': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };
  
  if (!issue || !currentAdminUser || !departments) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Access Control
  if (currentAdminUser.role !== 'admin' && currentAdminUser.role !== 'department') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">Access Denied</div>
          <p className="text-muted-foreground">You don't have sufficient privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const isUpvoted = issue.upvotedBy.includes(currentAdminUser._id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{issue.title}</h1>
        <p className="text-muted-foreground">{issue.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Details */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(issue.status)}>
                    {issue.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      // Logic to open status update dialog
                    }}
                  >
                    Change Status
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                  {issue.priority.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="secondary">{issue.category}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Assigned to Department</p>
                {issue.assignedToDepartment ? (
                  <Badge variant="secondary">
                    <Building className="h-3 w-3 mr-2" />
                    {departments.find(d => d._id === issue.assignedToDepartment)?.name || 'Unknown'}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not Assigned</span>
                )}
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {issue.location_address || 'Unknown location'}
                  </span>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <p className="text-sm text-muted-foreground">Reported By</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {issue.reporter?.firstName} {issue.reporter?.lastName}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Media Attachments */}
          {((issue.imageUrls && issue.imageUrls.length > 0) || (issue.videoUrls && issue.videoUrls.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Images and videos related to the issue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images */}
                {issue.imageUrls && issue.imageUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {issue.imageUrls.map((url, index) => (
                        <div key={index} className="relative h-52 w-52 rounded-md overflow-hidden">
                          <Image
                            src={url}
                            alt={`Issue image ${index + 1}`}
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Videos */}
                {issue.videoUrls && issue.videoUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Videos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {issue.videoUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <video
                            src={url}
                            controls
                            className="w-full h-48 rounded-md object-cover"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {issue.comments && issue.comments.length > 0 ? (
                  issue.comments.map((comment, index) => (
                    <div key={comment._id} className="flex gap-4">
                      <img
                        src={comment.user?.imageUrl || '/default-avatar.png'}
                        alt={comment.user?.firstName || 'User'}
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">
                            {comment.user?.firstName} {comment.user?.lastName}
                          </p>
                          {comment.isOfficial && (
                            <Badge variant="outline" className="text-xs">
                              {comment.user?.role}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center">No comments yet. Be the first to add one!</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Add a new comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={isLoading || !newComment.trim()}
                  className="self-end"
                >
                  {isLoading ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="status">Update Status</Label>
                <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusUpdate} className="w-full">
                  Update Status
                </Button>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="department">Assign Department</Label>
                <Select value={selectedDepartment || "unassigned"} onValueChange={(value: any) => setSelectedDepartment(value === "unassigned" ? null : value)}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Assign a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleDepartmentAssignment} className="w-full">
                  Assign
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button 
                  variant={isUpvoted ? "default" : "outline"} 
                  onClick={handleToggleUpvote}
                  className="flex-1"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Upvote ({issue.upvotes})
                </Button>
                <Button variant="ghost" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comments ({issue.comments.length})
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Updates and changes to the issue over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issue.statusUpdates.length > 0 ? (
                  issue.statusUpdates.map((update, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="h-full w-px bg-border pt-2" />
                      <div>
                        <p className="text-sm font-medium">
                          Status changed to <span className="capitalize">{update.newStatus}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {update.note}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">
                            {format(new Date(update.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No activity yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}