"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  UserPlus,
  Users,
  Search,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  Loader2,
  UserCog,
  Shield,
  Building2,
  BarChart3,
  Trash2,
  PencilLine,
  CheckCircle2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface User {
  id: string
  name: string
  email: string
  role: string
  employeeId?: string
  department?: string
  position?: string
}

export default function AdminDashboard({ user }: { user: any }) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortOption, setSortOption] = useState("name-asc")
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("leader")
  const [employeeId, setEmployeeId] = useState("")
  const [department, setDepartment] = useState("")
  const [position, setPosition] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users")
        const data = await response.json()
        setUsers(data)
        setFilteredUsers(data)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [toast])

  useEffect(() => {
    // Filter and sort users
    let result = [...users]

    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.employeeId && user.employeeId.toLowerCase().includes(query)) ||
          (user.department && user.department.toLowerCase().includes(query)) ||
          (user.position && user.position.toLowerCase().includes(query)),
      )
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      if (sortOption === "name-asc") {
        return a.name.localeCompare(b.name)
      } else if (sortOption === "name-desc") {
        return b.name.localeCompare(a.name)
      } else if (sortOption === "role") {
        return a.role.localeCompare(b.role)
      } else if (sortOption === "department") {
        const deptA = a.department || ""
        const deptB = b.department || ""
        return deptA.localeCompare(deptB)
      }
      return 0
    })

    setFilteredUsers(result)
  }, [users, searchQuery, roleFilter, sortOption])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          employeeId,
          department,
          position,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully",
        })

        // Add the new user to the list
        setUsers([...users, data])

        // Reset form and close dialog
        resetForm()
        setIsDialogOpen(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating the user",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
    setRole("leader")
    setEmployeeId("")
    setDepartment("")
    setPosition("")
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUsers = users.length
    const leaderCount = users.filter((user) => user.role === "leader").length
    const hrdCount = users.filter((user) => user.role === "hrd").length
    const adminCount = users.filter((user) => user.role === "admin").length

    const departmentCounts: Record<string, number> = {}
    users.forEach((user) => {
      if (user.department) {
        departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1
      }
    })

    const topDepartments = Object.entries(departmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    return {
      totalUsers,
      leaderCount,
      hrdCount,
      adminCount,
      leaderPercent: totalUsers ? Math.round((leaderCount / totalUsers) * 100) : 0,
      hrdPercent: totalUsers ? Math.round((hrdCount / totalUsers) * 100) : 0,
      adminPercent: totalUsers ? Math.round((adminCount / totalUsers) * 100) : 0,
      topDepartments,
    }
  }, [users])

  return (
    <div className="min-h-screen bg-purple-50/50 dark:bg-slate-900">
      <DashboardHeader user={user} />

      <main className="container mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage users and system settings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account with specific role and permissions.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leader">Leader</SelectItem>
                        <SelectItem value="hrd">HRD</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="employeeId" className="text-right">
                      Employee ID
                    </Label>
                    <Input
                      id="employeeId"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department" className="text-right">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="position" className="text-right">
                      Position
                    </Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  All Users
                </Badge>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Leaders ({stats.leaderCount})</span>
                  <span>{stats.leaderPercent}%</span>
                </div>
                <Progress value={stats.leaderPercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between text-xs">
                  <span>HRD ({stats.hrdCount})</span>
                  <span>{stats.hrdPercent}%</span>
                </div>
                <Progress value={stats.hrdPercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
                <div className="flex justify-between text-xs">
                  <span>Admins ({stats.adminCount})</span>
                  <span>{stats.adminPercent}%</span>
                </div>
                <Progress value={stats.adminPercent} className="h-1.5 bg-slate-100 dark:bg-slate-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">User Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                >
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Roles
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <UserCog className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium">Leaders</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.leaderCount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium">HRD</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.hrdCount}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-medium">Admins</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">{stats.adminCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">{stats.topDepartments.length}</div>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1" />
                  Departments
                </Badge>
              </div>
              <div className="mt-4 space-y-3">
                {stats.topDepartments.map((dept, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{dept.name}</span>
                      <span>{dept.count} users</span>
                    </div>
                    <Progress
                      value={stats.totalUsers ? (dept.count / stats.totalUsers) * 100 : 0}
                      className="h-1.5 bg-slate-100 dark:bg-slate-700"
                    />
                  </div>
                ))}
                {stats.topDepartments.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-2">No department data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold">System</div>
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Status
                </Badge>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm">API Services</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm">Database</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm">Storage</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, department..."
                className="pl-10 border-slate-300 dark:border-slate-700 focus-visible:ring-purple-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Sort</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOption("name-asc")}>Name (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("name-desc")}>Name (Z-A)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("role")}>Role</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("department")}>Department</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRoleFilter("all")}>All Roles</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("leader")}>Leaders</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("hrd")}>HRD</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("admin")}>Admins</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all users in the system</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                >
                  {filteredUsers.length} users
                </Badge>
              </div>
            </CardHeader>
            <Separator className="bg-slate-100 dark:bg-slate-700" />
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                  <span className="ml-2 text-lg">Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center p-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-4 mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No users found</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      There are no users matching your current filters. Try changing your search or create a new user.
                    </p>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSearchQuery("")
                        setRoleFilter("all")
                        setSortOption("name-asc")
                      }}
                    >
                      <Filter className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize ${
                                user.role === "admin"
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                  : user.role === "hrd"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                                    : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {user.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                              {user.role === "hrd" && <Users className="h-3 w-3 mr-1" />}
                              {user.role === "leader" && <UserCog className="h-3 w-3 mr-1" />}
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.employeeId || "-"}</TableCell>
                          <TableCell>{user.department || "-"}</TableCell>
                          <TableCell>{user.position || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
