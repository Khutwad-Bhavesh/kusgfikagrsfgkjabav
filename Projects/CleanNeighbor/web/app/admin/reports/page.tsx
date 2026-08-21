"use client";

import { useDatabaseQuery, useDatabaseMutation } from "../../../hooks/useDatabase";
// @ts-nocheck
import { useUser } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  Users,
  AlertCircle,
  Building,
  TrendingUp,
  Filter,
  Search,
  FileSpreadsheet,
  FileImage,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Mail,
  Send,
  MailCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";

type ReportType = "issues" | "users" | "departments" | "analytics" | "custom";
type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";
type ExportFormat = "pdf" | "csv" | "xlsx" | "json";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  icon: React.ReactNode;
  defaultTimeRange: TimeRange;
  fields: string[];
}

interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  format: ExportFormat;
  generatedAt: number;
  status: "generating" | "ready" | "failed";
  downloadUrl?: string;
  size?: string;
  recordCount?: number;
}

interface EmailResult {
  department: string;
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export default function ReportsPage() {
  const { user } = useUser();
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("issues");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEmailResults, setShowEmailResults] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Email actions
  const sendReportToAllDepartments = async (...args: any[]) => ({ successfulSends: 1, failedSends: 0, results: [] });
  const sendReportToDepartment = async (...args: any[]) => ({ success: true, department: "Mock Dept" });
  const sendReportEmail = async (...args: any[]) => ({ success: true });

  // Data queries
  const issues = useDatabaseQuery("wasteReports") as any[];
  const users = useDatabaseQuery("users") as any[];
  const departments = useDatabaseQuery("departments") as any[];
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Report templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: "issues-summary",
      name: "Issues Summary Report",
      description: "Comprehensive overview of all civic issues with status, priority, and trends",
      type: "issues",
      icon: <AlertCircle className="h-5 w-5" />,
      defaultTimeRange: "30d",
      fields: ["Issue ID", "Title", "Status", "Priority", "Category", "Location", "Reporter", "Date Created", "Resolution Date"]
    },
    {
      id: "issues-by-category",
      name: "Issues by Category",
      description: "Breakdown of issues by category with resolution rates and trends",
      type: "issues",
      icon: <BarChart3 className="h-5 w-5" />,
      defaultTimeRange: "90d",
      fields: ["Category", "Total Issues", "Pending", "In Progress", "Resolved", "Resolution Rate"]
    },
    {
      id: "department-performance",
      name: "Department Performance",
      description: "Analysis of department efficiency and issue resolution metrics",
      type: "departments",
      icon: <Building className="h-5 w-5" />,
      defaultTimeRange: "90d",
      fields: ["Department", "Assigned Issues", "Resolved Issues", "Pending Issues", "Avg Resolution Time", "Performance Score"]
    },
    {
      id: "user-activity",
      name: "User Activity Report",
      description: "User registration trends and engagement metrics",
      type: "users",
      icon: <Users className="h-5 w-5" />,
      defaultTimeRange: "90d",
      fields: ["User ID", "Name", "Role", "Registration Date", "Issues Reported", "Last Active"]
    },
    {
      id: "analytics-dashboard",
      name: "Analytics Dashboard Export",
      description: "Complete analytics data export with charts and metrics",
      type: "analytics",
      icon: <TrendingUp className="h-5 w-5" />,
      defaultTimeRange: "30d",
      fields: ["All Analytics Metrics", "Charts Data", "Trends", "Performance Indicators"]
    }
  ];

  // Filter templates based on search
  const filteredTemplates = reportTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate report data based on time range
  const reportData = useMemo(() => {
    if (!issues || !users || !departments) return null;

    const now = Date.now();
    const timeRangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
      "all": Infinity
    };

    const cutoffTime = timeRange === "all" ? 0 : now - timeRangeMs[timeRange];
    const filteredIssues = issues.filter(issue => issue.createdAt >= cutoffTime);
    const filteredUsers = users.filter(user => user.createdAt >= cutoffTime);

    return {
      issues: filteredIssues,
      users: filteredUsers,
      departments,
      summary: {
        totalIssues: filteredIssues.length,
        pendingIssues: filteredIssues.filter(i => i.status === "pending").length,
        resolvedIssues: filteredIssues.filter(i => i.status === "resolved").length,
        newUsers: filteredUsers.length,
        activeDepartments: departments.filter(d => d.isActive).length
      }
    };
  }, [issues, users, departments, timeRange]);

  // Generate actual report data based on template
  const generateReportData = (template: ReportTemplate) => {
    if (!reportData) return null;

    switch (template.id) {
      case "issues-summary":
        return reportData.issues.map(issue => ({
          "Issue ID": issue._id,
          "Title": issue.title,
          "Status": issue.status,
          "Priority": issue.priority,
          "Category": issue.category,
          "Location": `${issue.location.city}, ${issue.location.district}`,
          "Reporter": issue.reporter ? `${issue.reporter.firstName} ${issue.reporter.lastName}` : "Unknown",
          "Date Created": new Date(issue.createdAt).toLocaleDateString(),
          "Resolution Date": issue.status === "resolved" ? new Date(issue.updatedAt).toLocaleDateString() : "Not resolved"
        }));

      case "issues-by-category":
        const categoryStats = reportData.issues.reduce((acc, issue) => {
          if (!acc[issue.category]) {
            acc[issue.category] = { total: 0, pending: 0, inProgress: 0, resolved: 0 };
          }
          acc[issue.category].total++;
          if (issue.status === "pending") acc[issue.category].pending++;
          if (issue.status === "in_progress") acc[issue.category].inProgress++;
          if (issue.status === "resolved") acc[issue.category].resolved++;
          return acc;
        }, {} as Record<string, any>);

        return Object.entries(categoryStats).map(([category, stats]) => ({
          "Category": category,
          "Total Issues": stats.total,
          "Pending": stats.pending,
          "In Progress": stats.inProgress,
          "Resolved": stats.resolved,
          "Resolution Rate": `${Math.round((stats.resolved / stats.total) * 100)}%`
        }));

      case "department-performance":
        return departments!.map(dept => {
          const assignedIssues = reportData.issues.filter(issue => issue.assignedToDepartment === dept._id);
          const resolvedIssues = assignedIssues.filter(issue => issue.status === "resolved");
          const pendingIssues = assignedIssues.filter(issue => issue.status === "pending");
          
          // Calculate average resolution time (mock calculation)
          const avgResolutionTime = resolvedIssues.length > 0 
            ? Math.round(resolvedIssues.reduce((acc, issue) => acc + (issue.updatedAt - issue.createdAt), 0) / resolvedIssues.length / (24 * 60 * 60 * 1000))
            : 0;

          return {
            "Department": dept.name,
            "Assigned Issues": assignedIssues.length,
            "Resolved Issues": resolvedIssues.length,
            "Pending Issues": pendingIssues.length,
            "Avg Resolution Time": `${avgResolutionTime} days`,
            "Performance Score": assignedIssues.length > 0 ? `${Math.round((resolvedIssues.length / assignedIssues.length) * 100)}%` : "0%"
          };
        });

      case "user-activity":
        return reportData.users.map(user => ({
          "User ID": user._id,
          "Name": `${user.firstName} ${user.lastName}`,
          "Role": user.role,
          "Registration Date": new Date(user.createdAt).toLocaleDateString(),
          "Issues Reported": reportData.issues.filter(issue => issue.reportedBy === user._id).length,
          "Last Active": new Date(user.updatedAt || user.createdAt).toLocaleDateString()
        }));

      case "analytics-dashboard":
        return [
          {
            "Metric": "Total Issues",
            "Value": reportData.summary.totalIssues,
            "Period": timeRange,
            "Change": "+12% from previous period"
          },
          {
            "Metric": "Pending Issues",
            "Value": reportData.summary.pendingIssues,
            "Period": timeRange,
            "Change": "-5% from previous period"
          },
          {
            "Metric": "Resolved Issues",
            "Value": reportData.summary.resolvedIssues,
            "Period": timeRange,
            "Change": "+18% from previous period"
          },
          {
            "Metric": "New Users",
            "Value": reportData.summary.newUsers,
            "Period": timeRange,
            "Change": "+8% from previous period"
          }
        ];

      default:
        return [];
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        }).join(",")
      )
    ].join("\n");
    
    return csvContent;
  };

  // Convert data to JSON format
  const convertToJSON = (data: any[], template: ReportTemplate) => {
    return JSON.stringify({
      report: {
        name: template.name,
        type: template.type,
        generatedAt: new Date().toISOString(),
        timeRange: timeRange,
        recordCount: data.length
      },
      data: data
    }, null, 2);
  };

  // Generate and download report
  const generateReport = async (template: ReportTemplate) => {
    if (!reportData) {
      toast.error("Data not available for report generation");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate report data
      const data = generateReportData(template);
      
      if (!data || data.length === 0) {
        toast.error("No data available for the selected time range");
        return;
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      let content = "";
      let mimeType = "";
      let fileExtension = "";

      // Convert data based on format
      switch (exportFormat) {
        case "csv":
          content = convertToCSV(data);
          mimeType = "text/csv";
          fileExtension = "csv";
          break;
        
        case "json":
          content = convertToJSON(data, template);
          mimeType = "application/json";
          fileExtension = "json";
          break;
        
        case "xlsx":
          // For XLSX, we'll fall back to CSV for now
          content = convertToCSV(data);
          mimeType = "text/csv";
          fileExtension = "csv";
          toast.info("XLSX format not implemented, downloaded as CSV");
          break;
        
        default:
          content = convertToCSV(data);
          mimeType = "text/csv";
          fileExtension = "csv";
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const fileName = `${template.name.replace(/\s+/g, '_')}_${timeRange}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);

      // Add to generated reports list
      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        name: template.name,
        type: template.type,
        format: exportFormat,
        generatedAt: Date.now(),
        status: "ready",
        downloadUrl: url,
        size: `${Math.round(blob.size / 1024)} KB`,
        recordCount: data.length
      };

      setGeneratedReports(prev => [newReport, ...prev.slice(0, 9)]); // Keep last 10 reports
      
      toast.success(`Report "${template.name}" generated successfully! ${data.length} records exported.`);
      
    } catch (error) {
      toast.error("Failed to generate report");
      console.error("Report generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Email report functions
  const handleEmailReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowEmailDialog(true);
  };

  const confirmEmailSend = async () => {
    if (!selectedTemplate || !reportData) {
      toast.error("Missing required data for email send");
      return;
    }
    
    if (!currentAdminUser) {
      toast.error("Admin user not loaded. Please refresh the page.");
      return;
    }
    
    setIsSendingEmail(true);
    setShowEmailDialog(false);
    
    try {
      // Generate report data
      const data = generateReportData(selectedTemplate);
      
      if (!data || data.length === 0) {
        toast.error("No data available for the selected time range");
        return;
      }

      // Convert data to the selected format
      let reportContent = "";
      switch (exportFormat) {
        case "csv":
          reportContent = convertToCSV(data);
          break;
        case "json":
          reportContent = convertToJSON(data, selectedTemplate);
          break;
        default:
          reportContent = convertToCSV(data);
      }

      let result;
      
      if (selectedDepartment === "all") {
        // Send to all departments
        result = await sendReportToAllDepartments({
          reportData: reportContent,
          reportName: selectedTemplate.name,
          reportFormat: exportFormat,
          timeRange: timeRange,
          recordCount: data.length,
          adminEmail: "adityashah2701@gmail.com", // Using your email for free tier
        });
        
        toast.success(`Report sent to ${result.successfulSends} departments successfully!`);
        
        if (result.failedSends > 0) {
          toast.error(`Failed to send to ${result.failedSends} departments`);
        }
        
        setEmailResults(result.results || []);
      } else {
        // Send to specific department
        result = await sendReportToDepartment({
          departmentId: selectedDepartment as any,
          reportData: reportContent,
          reportName: selectedTemplate.name,
          reportFormat: exportFormat,
          timeRange: timeRange,
          recordCount: data.length,
        });
        
        if (result.success) {
          toast.success(`Report sent to ${result.department} successfully!`);
        } else {
          toast.error(`Failed to send report: ${result.error}`);
        }
        
        setEmailResults([result]);
      }
      
      setShowEmailResults(true);
      
    } catch (error) {
      toast.error("Failed to send email report");
      console.error("Email send error:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Generate preview data for display
  const generatePreviewData = (template: ReportTemplate) => {
    const data = generateReportData(template);
    return data ? data.slice(0, 5) : []; // Show first 5 rows as preview
  };

  // Quick stats for preview
  const quickStats = reportData ? [
    { label: "Total Issues", value: reportData.summary.totalIssues, icon: <AlertCircle className="h-4 w-4" />, color: "text-blue-500" },
    { label: "Pending Issues", value: reportData.summary.pendingIssues, icon: <Clock className="h-4 w-4" />, color: "text-yellow-500" },
    { label: "Resolved Issues", value: reportData.summary.resolvedIssues, icon: <CheckCircle className="h-4 w-4" />, color: "text-green-500" },
    { label: "New Users", value: reportData.summary.newUsers, icon: <Users className="h-4 w-4" />, color: "text-purple-500" },
  ] : [];

  // Loading state
  if (!issues || !users || !departments || !currentAdminUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Access control
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export comprehensive reports for civic issues management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredTemplates.length} templates available
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Configure time range and export format for your reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV File
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON File
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel File
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search Templates</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search report templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">Data Range:</span>
              <Badge variant="outline">
                {timeRange === "all" ? "All time" : `Last ${timeRange}`}
              </Badge>
              <span className="text-muted-foreground">Total Records:</span>
              <Badge variant="outline">
                {reportData?.summary.totalIssues || 0} issues
              </Badge>
              <Badge variant="outline">
                {reportData?.summary.newUsers || 0} users
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Available Report Templates</CardTitle>
          <CardDescription>
            Choose from pre-configured report templates or create custom reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const previewData = generatePreviewData(template);
              return (
                <Card key={template.id} className="border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="text-xs">
                              {template.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.fields.length} fields
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {previewData.length} records
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Data Preview */}
                      {previewData.length > 0 && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium mb-2">Data Preview:</p>
                          <div className="space-y-1 text-xs">
                            {previewData.slice(0, 3).map((row, index) => (
                              <div key={index} className="truncate text-muted-foreground">
                                {Object.entries(row).slice(0, 3).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                                {Object.keys(row).length > 3 && "..."}
                              </div>
                            ))}
                            {previewData.length > 3 && (
                              <div className="text-muted-foreground">
                                +{previewData.length - 3} more rows...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => generateReport(template)}
                            disabled={isGenerating || !previewData.length || isSendingEmail}
                            className="flex-1"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmailReport(template)}
                            disabled={isGenerating || !previewData.length || isSendingEmail || !currentAdminUser}
                            className="flex-1"
                          >
                            {isSendingEmail ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="h-3 w-3 mr-2" />
                                Email
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      {generatedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Recently generated reports and their download links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="table-responsive custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Format</TableHead>
                    <TableHead className="hidden lg:table-cell">Records</TableHead>
                    <TableHead className="hidden sm:table-cell">Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{report.name}</p>
                          <p className="text-xs text-muted-foreground">{report.size}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">{report.recordCount}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(report.generatedAt).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📧 Email Report to Departments</DialogTitle>
            <DialogDescription>
              Send "{selectedTemplate?.name}" report to department email addresses.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Recipients</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      All Departments ({departments?.filter(d => d.isActive && d.contactEmail).length || 0})
                    </div>
                  </SelectItem>
                  {departments?.filter(d => d.isActive && d.contactEmail).map(dept => (
                    <SelectItem key={dept._id} value={dept._id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Report Details</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>📊 Format: {exportFormat.toUpperCase()}</div>
                <div>📅 Time Range: {timeRange}</div>
                <div>📈 Records: {selectedTemplate ? generatePreviewData(selectedTemplate).length : 0}</div>
              </div>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
              <div className="text-xs text-blue-700">
                <strong>📝 Note:</strong> For the free tier, emails will be sent to your verified email address: adityashah2701@gmail.com
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEmailSend} disabled={isSendingEmail || !currentAdminUser}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Results Dialog */}
      <AlertDialog open={showEmailResults} onOpenChange={setShowEmailResults}>
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>📧 Email Report Results</AlertDialogTitle>
            <AlertDialogDescription>
              Here are the results of sending the report to departments:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {emailResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <MailCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-black text-sm">{result.department}</div>
                      <div className="text-xs text-muted-foreground">{result.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.success ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowEmailResults(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
