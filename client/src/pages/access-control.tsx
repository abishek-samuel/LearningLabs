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
import { Search, Lock, Plus, Pencil, Trash2, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AccessControl() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedAccessType, setSelectedAccessType] = useState("view");
  const [selectedUserOrGroup, setSelectedUserOrGroup] = useState("");
  const [assignmentType, setAssignmentType] = useState("user");

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/course-access"] });
    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
  }, []);

  const { data: courseAccess, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["course-access"],
    queryFn: async () => {
      const response = await fetch("/api/course-access");
      if (!response.ok) throw new Error("Failed to fetch course access");
      return response.json();
    },
  });


  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses");
      if (!response.ok) throw new Error("Failed to fetch courses");
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await fetch("/api/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");
      return response.json();
    },
  });

  const [editAccessId, setEditAccessId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const addAccessMutation = useMutation({
    mutationFn: async (accessData: any) => {
      const response = await fetch("/api/course-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accessData),
      });
      if (!response.ok) throw new Error("Failed to add course access");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-access"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Course access added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add course access",
        variant: "destructive",
      });
    },
  });

  const deleteAccessMutation = useMutation({
    mutationFn: async (accessId: number) => {
      const response = await fetch(`/api/course-access/${accessId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete course access");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-access"] });
      toast({
        title: "Success",
        description: "Course access deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete course access",
        variant: "destructive",
      });
    },
  });

  const editAccessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/course-access/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update course access");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-access"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Course access updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update course access",
        variant: "destructive",
      });
    },
  });

  const handleAddAccess = () => {
    const accessData = {
      courseId: parseInt(selectedCourse),
      accessType: selectedAccessType,
      [assignmentType === "user" ? "userId" : "groupId"]:
        parseInt(selectedUserOrGroup),
    };
    addAccessMutation.mutate(accessData);
  };

  const handleViewDetails = (courseId: number) => {
    setLocation(`/course-detail/${courseId}`);
  };

  const handleDeleteAccess = (accessId: number) => {
    if (confirm("Are you sure you want to delete this access?")) {
      deleteAccessMutation.mutate(accessId);
    }
  };

  const filteredAccess = courseAccess?.filter((access: any) =>
    access.course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">
            Access Control
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage course access and permissions (Control who can access which courses)
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search course access..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Assign Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Course Access</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Course
                  </label>
                  <Select
                    value={selectedCourse}
                    onValueChange={setSelectedCourse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course: any) => (
                        <SelectItem
                          key={course.id}
                          value={course.id.toString()}
                        >
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Assignment Type
                  </label>
                  <Select
                    value={assignmentType}
                    onValueChange={setAssignmentType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {assignmentType === "user" ? "User" : "Group"}
                  </label>
                  <Select
                    value={selectedUserOrGroup}
                    onValueChange={setSelectedUserOrGroup}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={`Select a ${assignmentType}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentType === "user"
                        ? users?.map((user: any) => (
                          <SelectItem
                            key={user.id}
                            value={user.id.toString()}
                          >
                            {user.username}
                          </SelectItem>
                        ))
                        : groups?.map((group: any) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Access Type
                  </label>
                  <Select
                    value={selectedAccessType}
                    onValueChange={setSelectedAccessType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddAccess} className="w-full">
                  Add Access
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Course Access</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Course
                  </label>
                  <Select
                    value={selectedCourse}
                    onValueChange={setSelectedCourse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course: any) => (
                        <SelectItem
                          key={course.id}
                          value={course.id.toString()}
                        >
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Assignment Type
                  </label>
                  <Select
                    value={assignmentType}
                    onValueChange={(value) => {
                      setAssignmentType(value);
                      setSelectedUserOrGroup(''); // Reset selection when type changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {assignmentType === "user" ? "User" : "Group"}
                  </label>
                  <Select
                    value={selectedUserOrGroup}
                    onValueChange={setSelectedUserOrGroup}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={`Select a ${assignmentType}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentType === "user"
                        ? users?.map((user: any) => (
                          <SelectItem
                            key={user.id}
                            value={user.id.toString()}
                          >
                            {user.username}
                          </SelectItem>
                        ))
                        : groups?.map((group: any) => (
                          <SelectItem
                            key={group.id}
                            value={group.id.toString()}
                          >
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Access Type
                  </label>
                  <Select
                    value={selectedAccessType}
                    onValueChange={setSelectedAccessType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editAccessId) {
                    editAccessMutation.mutate({
                      id: editAccessId,
                      data: {
                        courseId: parseInt(selectedCourse),
                        accessType: selectedAccessType,
                        [assignmentType === "user" ? "userId" : "groupId"]:
                          parseInt(selectedUserOrGroup),
                      },
                    });
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Access Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Assigned</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccess?.map((access: any) => (
                  <TableRow key={access.id}>
                    <TableCell className="font-medium">
                      {access.course.title}
                    </TableCell>
                    <TableCell>{access.accessType}</TableCell>
                    <TableCell>
                      {access.user
                        ? access.user.username
                        : access.group?.name}
                    </TableCell>
                    <TableCell>{access.user ? "User" : "Group"}</TableCell>
                    <TableCell>
                      {new Date(access.grantedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleViewDetails(access.course.id)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditAccessId(access.id);
                            setSelectedCourse(access.course.id.toString());
                            setSelectedAccessType(access.accessType);
                            if (access.user) {
                              setAssignmentType("user");
                              setSelectedUserOrGroup(access.user.id.toString());
                            } else if (access.group) {
                              setAssignmentType("group");
                              setSelectedUserOrGroup(access.group.id.toString());
                            }
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteAccess(access.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
