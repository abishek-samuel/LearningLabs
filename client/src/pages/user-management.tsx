import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, MoreHorizontal, Loader2  } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "employee",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedUser ? `/api/users/${selectedUser.id}` : "/api/users";
      const method = selectedUser ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save user");
      
      setIsDialogOpen(false);
      fetchUsers();
      toast({
        title: "Success",
        description: `User ${selectedUser ? "updated" : "created"} successfully`,
      });
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleViewDetails = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user details');
      const data = await response.json();
      setSelectedUser(data);
      setIsDetailsOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      
      fetchUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };
  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
      <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">User Management</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button onClick={() => {
              setSelectedUser(null);
              setFormData({ name: "", email: "", role: "employee", password: "" });
              setIsDialogOpen(true);
            }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        
        
      <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            {/* <Input 
              placeholder="Search users..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            /> */}
          </div>
          {/* <div className="flex gap-2">
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
          </div> */}
        </div>
        
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
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(user.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(user)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(user.id)}
                          >
                            Delete
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
      </div>

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
    </MainLayout>
  );
}