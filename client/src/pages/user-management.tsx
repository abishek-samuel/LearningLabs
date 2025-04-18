import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, Search, MoreHorizontal, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string; // Added status field
}

export default function UserManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [draftUsers, setDraftUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "employee",
  });

  useEffect(() => {
    fetchUsers();
    fetchDraftUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/all/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDraftUsers = async () => {
    try {
      const response = await fetch("/api/draft-users");
      if (!response.ok) throw new Error("Failed to fetch draft users");
      const data = await response.json();
      setDraftUsers(data);
    } catch (error) {
      console.error("Error fetching draft users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setLoading(true);
    if (value === "active") {
      fetchUsers();
    } else if (value === "pending") {
      fetchDraftUsers();
    }
  };

  const generateRandomPassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()";

    let password = "";
    password += upper.charAt(Math.floor(Math.random() * upper.length));
    password += lower.charAt(Math.floor(Math.random() * lower.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));

    const allChars = upper + lower + numbers + special;
    for (let i = 0; i < 2; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    return password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  };

  const handleApproveUser = async (userId: number) => {
    const generatedPassword = generateRandomPassword();
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: generatedPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve user");
      }
      toast({
        title: "User Approved",
        description: "The user has been approved and notified via email.",
        variant: "success",
      });
      fetchDraftUsers(); // Refresh the list after approval
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/reject`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject user");
      }
      toast({
        title: "User Rejected",
        description: "The user has been rejected and notified via email.",
        variant: "success",
      });
      fetchDraftUsers(); // Refresh the list after rejection
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();
      setSelectedUser(data);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) throw new Error("Failed to update user");
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrompt = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");

      const result = await response.json();

      fetchUsers();
      toast({
        title: "Success",
        description: result.message || "User marked as inactive",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!userToDelete) return;
    const newStatus = userToDelete.status === "active" ? "inactive" : "active";

    try {
      const response = await fetch(`/api/users/${userToDelete.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update user status");

      const result = await response.json();

      fetchUsers();
      toast({
        title: "Success",
        description: result.message || `User marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };


  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      user.username?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.firstName?.toLowerCase().includes(term) ||
      user.lastName?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term);

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole && user.status !== "draft"; //Exclude draft users from main list
  });

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">
              User Management
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button onClick={() => navigate("/add-user")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="contributor">Contributor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <Tabs defaultValue="active" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="active">Active Users</TabsTrigger>
            <div className="relative">
              <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
              {draftUsers.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-semibold px-1.5 rounded-full">
                  {draftUsers.length}
                </span>
              )}
            </div>
          </TabsList>
          <TabsContent value="active">
            <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-14"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">
                          {user.role}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full capitalize 
      ${user.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"}`}
                          >
                            {user.status}
                          </span>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(user.id)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(user)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => handleDeletePrompt(user)}
                              >
                                {user.status === "active" ? "Inactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          <TabsContent value="pending">
            <div className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftUsers.filter((user) => user.status === "draft").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                          No data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      draftUsers
                        .filter((user) => user.status === "draft")
                        .map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="capitalize">
                              {user.role}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApproveUser(user.id)}>
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRejectUser(user.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>

                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="font-medium">Username</label>
                <p>{selectedUser.username}</p>
              </div>
              <div>
                <label className="font-medium">Email</label>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <label className="font-medium">Full Name</label>
                <p>
                  {selectedUser.firstName && selectedUser.lastName
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : "Not provided"}
                </p>
              </div>
              <div>
                <label className="font-medium">Role</label>
                <p className="capitalize">{selectedUser.role}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
            className="space-y-4"
          >
            <Input
              placeholder="First Name"
              value={editFormData.firstName}
              onChange={(e) =>
                setEditFormData({ ...editFormData, firstName: e.target.value })
              }
            />
            <Input
              placeholder="Last Name"
              value={editFormData.lastName}
              onChange={(e) =>
                setEditFormData({ ...editFormData, lastName: e.target.value })
              }
            />
            <Input
              placeholder="Email"
              value={editFormData.email}
              onChange={(e) =>
                setEditFormData({ ...editFormData, email: e.target.value })
              }
            />
            <select
              className="w-full border px-3 py-2 rounded-md"
              value={editFormData.role}
              onChange={(e) =>
                setEditFormData({ ...editFormData, role: e.target.value })
              }
            >
              <option value="employee">Employee</option>
              <option value="contributor">Contributor</option>
              <option value="admin">Admin</option>
            </select>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userToDelete?.status === "active" ? "Mark as Inactive" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {userToDelete?.status === "active" ? "mark" : "activate"}{" "}
              <span className="font-semibold">{userToDelete?.username}</span>{" "}
              {userToDelete?.status === "active" ? "as inactive" : "as active"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              No
            </Button>
            <Button variant={userToDelete?.status === "active" ? "destructive" : "default"} onClick={confirmStatusChange}>
              {userToDelete?.status === "active" ? "Yes, Mark Inactive" : "Yes, Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
