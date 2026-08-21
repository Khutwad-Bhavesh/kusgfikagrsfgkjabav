"use client";

import { useDatabaseQuery } from "../../../hooks/useDatabase";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Building,
  MapPin,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { useMemo } from "react";

export default function AnalyticsPage() {
  const { user } = useUser();

  const issues = useDatabaseQuery("wasteReports") as any[];
  const departments = useDatabaseQuery("departments") as any[];
  const users = useDatabaseQuery("users") as any[];
  const currentAdminUserArr = useDatabaseQuery("users") as any[];
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null;

  // Calculate analytics data
  const analytics = useMemo(() => {
    if (!issues || !departments || !users) return null;

    // Basic stats
    const totalIssues = issues.length;
    const pendingIssues = issues.filter(
      (issue) => issue.status === "pending"
    ).length;
    const acknowledgedIssues = issues.filter(
      (issue) => issue.status === "acknowledged"
    ).length;
    const inProgressIssues = issues.filter(
      (issue) => issue.status === "in_progress"
    ).length;
    const resolvedIssues = issues.filter(
      (issue) => issue.status === "resolved"
    ).length;
    const rejectedIssues = issues.filter(
      (issue) => issue.status === "rejected"
    ).length;

    // Resolution rate
    const resolutionRate =
      totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    // Category breakdown
    const categoryStats = issues.reduce(
      (acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const categoryData = Object.entries(categoryStats)
      .map(([category, count]) => ({
        name: category,
        value: count,
        percentage: Math.round((count / totalIssues) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    // Priority distribution
    const priorityStats = issues.reduce(
      (acc, issue) => {
        acc[issue.priority] = (acc[issue.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const priorityData = [
      { name: "Low", value: priorityStats.low || 0, color: "#22c55e" },
      { name: "Medium", value: priorityStats.medium || 0, color: "#eab308" },
      { name: "High", value: priorityStats.high || 0, color: "#f97316" },
      { name: "Urgent", value: priorityStats.urgent || 0, color: "#ef4444" },
    ];

    // Status distribution for pie chart (FIXED)
    const statusData = [
      { name: "Pending", value: pendingIssues, color: "#eab308" },
      { name: "Acknowledged", value: acknowledgedIssues, color: "#3b82f6" },
      { name: "In Progress", value: inProgressIssues, color: "#8b5cf6" },
      { name: "Resolved", value: resolvedIssues, color: "#22c55e" },
      { name: "Rejected", value: rejectedIssues, color: "#ef4444" },
    ]
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage:
          totalIssues > 0 ? Math.round((item.value / totalIssues) * 100) : 0,
      }));

    // Issues over time (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const issuesInLast30Days = issues.filter(
      (issue) => issue.createdAt >= thirtyDaysAgo
    );

    // Group by date
    const dailyStats: Record<
      string,
      { date: string; total: number; resolved: number; pending: number }
    > = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const dayIssues = issuesInLast30Days.filter(
        (issue) => issue.createdAt >= dayStart && issue.createdAt < dayEnd
      );

      dailyStats[dateStr] = {
        date: dateStr,
        total: dayIssues.length,
        resolved: dayIssues.filter((issue) => issue.status === "resolved")
          .length,
        pending: dayIssues.filter((issue) => issue.status === "pending").length,
      };
    }

    const timeSeriesData = Object.values(dailyStats);

    // Location stats
    const locationStats = issues.reduce(
      (acc, issue) => {
        const location = `${issue.location.city}, ${issue.location.district}`;
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topLocations = Object.entries(locationStats)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Department performance
    const departmentPerformance = departments
      .map((dept) => {
        const assignedIssues = issues.filter(
          (issue) => issue.assignedToDepartment === dept._id
        );
        const resolvedByDept = assignedIssues.filter(
          (issue) => issue.status === "resolved"
        );
        const pendingByDept = assignedIssues.filter(
          (issue) => issue.status === "pending"
        );

        return {
          name: dept.name,
          total: assignedIssues.length,
          resolved: resolvedByDept.length,
          pending: pendingByDept.length,
          resolutionRate:
            assignedIssues.length > 0
              ? Math.round(
                  (resolvedByDept.length / assignedIssues.length) * 100
                )
              : 0,
        };
      })
      .filter((dept) => dept.total > 0);

    // Response time analysis (mock data - you can implement actual calculation)
    const avgResponseTime = "2.3 hours";
    const avgResolutionTime = "4.7 days";

    // Growth trends (comparing current month with previous)
    const currentMonth = new Date().getMonth();
    const currentMonthIssues = issues.filter(
      (issue) => new Date(issue.createdAt).getMonth() === currentMonth
    ).length;

    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthIssues = issues.filter(
      (issue) => new Date(issue.createdAt).getMonth() === previousMonth
    ).length;

    const growthRate =
      previousMonthIssues > 0
        ? Math.round(
            ((currentMonthIssues - previousMonthIssues) / previousMonthIssues) *
              100
          )
        : 0;

    return {
      totalIssues,
      pendingIssues,
      acknowledgedIssues,
      inProgressIssues,
      resolvedIssues,
      rejectedIssues,
      resolutionRate,
      categoryData,
      priorityData,
      statusData,
      timeSeriesData,
      topLocations,
      departmentPerformance,
      avgResponseTime,
      avgResolutionTime,
      growthRate,
      totalDepartments: departments.length,
      totalUsers: users.length,
      activeDepartments: departments.filter((d) => d.isActive).length,
    };
  }, [issues, departments, users]);

  // Loading state
  if (!issues || !departments || !users || !currentAdminUser || !analytics) {
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

  const COLORS = [
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#eab308",
    "#ef4444",
    "#f97316",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights into civic issues management and system
            performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Real-time data</span>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalIssues}</div>
            <div className="flex items-center gap-1 mt-1">
              {analytics.growthRate > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
              <span
                className={`text-xs ${analytics.growthRate > 0 ? "text-red-500" : "text-green-500"}`}
              >
                {Math.abs(analytics.growthRate)}% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {analytics.resolutionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.resolvedIssues} of {analytics.totalIssues} issues
              resolved
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Response Time
            </CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {analytics.avgResponseTime}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to acknowledge
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {analytics.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.activeDepartments} departments active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Issue Status Distribution</CardTitle>
            <CardDescription>
              Current status of all reported issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Issues Trend Over Time */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Issues Trend (Last 30 Days)</CardTitle>
            <CardDescription>
              Daily issue reports and resolutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                    formatter={(value, name) => [
                      value,
                      name === "total"
                        ? "Total Issues"
                        : name === "resolved"
                          ? "Resolved"
                          : "Pending",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stackId="2"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>
              Issues categorized by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {analytics.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Department Performance */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
          <CardDescription>
            Issue assignment and resolution by department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.departmentPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No department assignments yet</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.departmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Assigned" />
                  <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
                  <Bar dataKey="pending" fill="#eab308" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Locations */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Top Issue Locations</CardTitle>
          <CardDescription>Areas with highest issue reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topLocations.map((location, index) => (
              <div
                key={location.location}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {location.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(location.count / analytics.totalIssues) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {location.count} issues
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Excellent</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.resolutionRate}% resolution rate,{" "}
              {analytics.avgResponseTime} avg response
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {analytics.avgResolutionTime}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From report to resolution
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Department Coverage
            </CardTitle>
            <Building className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {Math.round(
                (analytics.activeDepartments / analytics.totalDepartments) * 100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.activeDepartments} of {analytics.totalDepartments}{" "}
              departments active
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
