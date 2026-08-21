"use client"
import { useDatabaseQuery, useDatabaseMutation } from "../../../hooks/useDatabase"
// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertCircle,
  MapPin,
  Calendar,
  User,
  ArrowUpDown,
  Search,
  Eye,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Video,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"

type SortField = "title" | "status" | "priority" | "createdAt" | "category" | "location"
type SortDirection = "asc" | "desc"
type StatusFilter = "all" | "pending" | "acknowledged" | "in_progress" | "resolved" | "rejected"
type PriorityFilter = "all" | "low" | "medium" | "high" | "urgent"

interface ColumnVisibility {
  issueDetails: boolean
  status: boolean
  priority: boolean
  category: boolean
  location: boolean
  reporter: boolean
  date: boolean
  department: boolean
  actions: boolean
}

export default function IssuesPage() {
  const { user } = useUser()

  // Filters and sorting state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    issueDetails: true,
    status: true,
    priority: true,
    category: false, // Hidden by default on smaller screens
    location: false, // Hidden by default on smaller screens
    reporter: false, // Hidden by default on smaller screens
    date: true,
    department: true, // Hidden by default on smaller screens
    actions: true,
  })

  // Data queries
  const issues = useDatabaseQuery("wasteReports") as any[]
  const departments = useDatabaseQuery("departments") as any[]

  // Get current admin user
  const currentAdminUserArr = useDatabaseQuery("users") as any[]
  const currentAdminUser = currentAdminUserArr?.find((u: any) => u.clerkId === user?.id) || null

  // Mutations
  const { mutate: updateIssueStatus } = useDatabaseMutation("wasteReports")
  const { mutate: assignToDepartment } = useDatabaseMutation("wasteReports")

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!issues) return []
    const uniqueCategories = [...new Set(issues.map((issue) => issue.category))]
    return uniqueCategories
  }, [issues])

  // Filter and sort issues
  const filteredAndSortedIssues = useMemo(() => {
    if (!issues) return []

    const filtered = issues.filter((issue) => {
      const matchesSearch =
        searchTerm === "" ||
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.location.district.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || issue.status === statusFilter
      const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })

    // Sort issues
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === "location") {
        aValue = `${a.location.city}, ${a.location.district}`
        bValue = `${b.location.city}, ${b.location.district}`
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [issues, searchTerm, statusFilter, priorityFilter, categoryFilter, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedIssues.length / itemsPerPage)
  const paginatedIssues = filteredAndSortedIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }))
  }

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      if (!currentAdminUser?._id) {
        toast.error("Admin user not found. Please refresh and try again.")
        return
      }

      await updateIssueStatus({
        issueId: issueId as any,
        newStatus: newStatus as "pending" | "acknowledged" | "in_progress" | "resolved" | "rejected",
        updatedBy: currentAdminUser._id,
        note: `Status updated to ${newStatus} by ${currentAdminUser.firstName} ${currentAdminUser.lastName}`,
      })
      toast.success("Issue status updated successfully")
    } catch (error) {
      console.error("Status update error:", error)
      toast.error("Failed to update issue status")
    }
  }

  const handleDepartmentAssignment = async (issueId: string, departmentId: string) => {
    try {
      if (!currentAdminUser?._id) {
        toast.error("Admin user not found. Please refresh and try again.")
        return
      }

      await assignToDepartment({
        issueId: issueId as any,
        departmentId: departmentId as any,
        assignedBy: currentAdminUser._id,
        note: `Issue assigned by ${currentAdminUser.firstName} ${currentAdminUser.lastName} from admin dashboard`,
      })
      toast.success("Issue assigned to department successfully")
    } catch (error) {
      console.error("Department assignment error:", error)
      toast.error("Failed to assign issue to department")
    }
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "acknowledged":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "in_progress":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20"
      case "resolved":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-500/10 text-green-500"
      case "medium":
        return "bg-yellow-500/10 text-yellow-500"
      case "high":
        return "bg-orange-500/10 text-orange-500"
      case "urgent":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />
      case "acknowledged":
        return <Eye className="h-3 w-3" />
      case "in_progress":
        return <AlertCircle className="h-3 w-3" />
      case "resolved":
        return <CheckCircle className="h-3 w-3" />
      case "rejected":
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  if (!issues || !departments || !currentAdminUser) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check if the current user is actually an admin
  if (currentAdminUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-red-500 mb-2">Access Denied</div>
          <p className="text-muted-foreground">You don't have admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Issues Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage civic issues reported through the mobile application
          </p>
        </div>
    
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
          <CardDescription>Filter and search through {issues.length} total issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search issues, locations, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
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

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={(value: PriorityFilter) => setPriorityFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary and Column Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {paginatedIssues.length} of {filteredAndSortedIssues.length} issues
              {filteredAndSortedIssues.length !== issues.length && <span> (filtered from {issues.length} total)</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto bg-transparent">
                    <Columns3 className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.issueDetails}
                    onCheckedChange={() => toggleColumnVisibility("issueDetails")}
                  >
                    Issue Details
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.status}
                    onCheckedChange={() => toggleColumnVisibility("status")}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.priority}
                    onCheckedChange={() => toggleColumnVisibility("priority")}
                  >
                    Priority
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.category}
                    onCheckedChange={() => toggleColumnVisibility("category")}
                  >
                    Category
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.location}
                    onCheckedChange={() => toggleColumnVisibility("location")}
                  >
                    Location
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.reporter}
                    onCheckedChange={() => toggleColumnVisibility("reporter")}
                  >
                    Reporter
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.date}
                    onCheckedChange={() => toggleColumnVisibility("date")}
                  >
                    Date
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.department}
                    onCheckedChange={() => toggleColumnVisibility("department")}
                  >
                    Department
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.actions}
                    onCheckedChange={() => toggleColumnVisibility("actions")}
                  >
                    Actions
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setPriorityFilter("all")
                    setCategoryFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues DataTable */}
      <Card className="">
        <CardContent className="p-0 ">
          <div className="rounded-md">
            <div className="table-responsive custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    {columnVisibility.issueDetails && (
                      <TableHead className="w-[200px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("title")}
                        >
                          Issue Details
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.status && (
                      <TableHead className="w-[170px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("status")}
                        >
                          Status
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.priority && (
                      <TableHead className="w-[100px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("priority")}
                        >
                          Priority
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.category && (
                      <TableHead className="w-[120px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("category")}
                        >
                          Category
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.location && (
                      <TableHead className="w-[180px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("location")}
                        >
                          Location
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.reporter && <TableHead className="w-[140px] py-4">Reporter</TableHead>}
                    {columnVisibility.date && (
                      <TableHead className="w-[120px] py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 font-medium hover:bg-accent/50"
                          onClick={() => handleSort("createdAt")}
                        >
                          Date
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.department && <TableHead className="w-[160px] py-4">Department</TableHead>}
                    {columnVisibility.actions && <TableHead className="text-right w-[80px] py-4">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {issues.length === 0 ? "No issues found" : "No issues match your filters"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedIssues.map((issue) => (
                      <TableRow key={issue._id} className="border-border/30 hover:bg-accent/30 transition-colors">
                        {columnVisibility.issueDetails && (
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-foreground line-clamp-1">{issue.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 max-w-[200px]">{issue.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {issue.imageUrls && issue.imageUrls.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ImageIcon className="h-3 w-3" />
                                        <span>{issue.imageUrls.length}</span>
                                      </div>
                                    )}
                                    {issue.videoUrls && issue.videoUrls.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Video className="h-3 w-3" />
                                        <span>{issue.videoUrls.length}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {columnVisibility.status && (
                          <TableCell className="py-4">
                            <Select
                              value={issue.status}
                              onValueChange={(value) => handleStatusChange(issue._id, value)}
                            >
                              <SelectTrigger className="w-[170px] border-border/50 hover:border-border transition-colors">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(issue.status)}
                                  <Badge
                                    variant="outline"
                                    className={`${getStatusColor(issue.status)} text-xs font-medium border-0`}
                                  >
                                    {issue.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-yellow-500" />
                                    <span>Pending</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="acknowledged">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-3 w-3 text-blue-500" />
                                    <span>Acknowledged</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-purple-500" />
                                    <span>In Progress</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="resolved">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span>Resolved</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-3 w-3 text-red-500" />
                                    <span>Rejected</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {columnVisibility.priority && (
                          <TableCell className="py-4">
                            <Badge variant="outline" className={getPriorityColor(issue.priority)}>
                              {issue.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                        )}

                        {columnVisibility.category && (
                          <TableCell className="py-4">
                            <span className="text-sm">{issue.category}</span>
                          </TableCell>
                        )}

                        {columnVisibility.location && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {issue.location.city}, {issue.location.district}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {columnVisibility.reporter && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {issue.reporter?.firstName} {issue.reporter?.lastName}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {columnVisibility.date && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">{new Date(issue.createdAt).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                        )}

                        {columnVisibility.department && (
                          <TableCell className="py-4">
                            <Select
                              value={issue.assignedToDepartment || "unassigned"}
                              onValueChange={(value) =>
                                value !== "unassigned" && handleDepartmentAssignment(issue._id, value)
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Assign Department">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-3 w-3 flex-shrink-0" />
                                    <span className="text-sm truncate">
                                      {issue.assignedToDepartment
                                        ? departments?.find((d) => d._id === issue.assignedToDepartment)?.name ||
                                          "Unknown"
                                        : "Unassigned"}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {departments?.map((dept) => (
                                  <SelectItem key={dept._id} value={dept._id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}

                        {columnVisibility.actions && (
                          <TableCell className="text-right py-4">
                            <div className="flex items-center gap-2 justify-end">
                              <Link href={`/admin/waste-reports/${issue._id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="min-w-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="min-w-0"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
