"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Trash, Loader2 } from "lucide-react";

export default function CourseApproval() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<any>(null);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["pending-courses"] });
  }, []);

  const {
    data: pendingCourses = [],
    isLoading: isPendingLoading,
  } = useQuery({
    queryKey: ["pending-courses"],
    queryFn: async () => {
      const res = await fetch("/api/pending-courses");
      if (!res.ok) throw new Error("Failed to fetch pending courses");
      return res.json();
    },
  });

  const {
    data: publishedCourses = [],
    isLoading: isPublishedLoading,
  } = useQuery({
    queryKey: ["published-courses"],
    queryFn: async () => {
      const res = await fetch("/api/published-courses");
      if (!res.ok) throw new Error("Failed to fetch published courses");
      return res.json();
    },
  });

  const {
    data: rejectedCourses = [],
    isLoading: isRejectedLoading,
  } = useQuery({
    queryKey: ["rejected-courses"],
    queryFn: async () => {
      const res = await fetch("/api/rejected-courses");
      if (!res.ok) throw new Error("Failed to fetch rejected courses");
      return res.json();
    },
  });

  const approveRejectMutation = useMutation({
    mutationFn: async ({
      courseId,
      action,
    }: {
      courseId: number;
      action: "approve" | "reject";
    }) => {
      const res = await fetch(`/api/courses/${courseId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to ${action} course`);
      return res.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-courses"] });
      queryClient.invalidateQueries({ queryKey: ["published-courses"] });
      queryClient.invalidateQueries({ queryKey: ["rejected-courses"] });
      toast({
        title: "Success",
        description:
          action === "approve"
            ? "Course approved and published"
            : "Course rejected",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process request",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: number) => {
      try {
        console.log("Attempting to delete course with ID:", courseId);
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "DELETE",
        });

        console.log("Delete response status:", res.status);

        if (!res.ok) {
          // Try parsing error response
          const errorData = await res.json().catch(() => ({}));
          console.error("Delete failed:", errorData);
          throw new Error(errorData.message || "Failed to delete course");
        }

        if (res.status === 204) {
          console.log("Course deleted successfully. No content returned (204).");
          return null;
        }

        const data = await res.json().catch(() => ({}));
        console.log("Delete successful with response body:", data);
        return data;

      } catch (err) {
        console.error("Unexpected error in delete mutation:", err);
        throw err;
      }
    },

    onSuccess: () => {
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pending-courses"] });
      queryClient.invalidateQueries({ queryKey: ["published-courses"] });
      queryClient.invalidateQueries({ queryKey: ["rejected-courses"] });

      toast({
        title: "Deleted",
        description: "Course deleted successfully",
      });
    },

    onError: (error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete course",
        variant: "destructive",
      });
    },
  });



  const handleConfirmDelete = () => {
    if (courseToDelete) deleteMutation.mutate(courseToDelete.id);
  };

  const renderCourses = (
    courses: any[],
    type: "pending" | "published" | "rejected"
  ) => {
    if (!courses.length) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No courses found
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                {course.description}
              </p>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Creator: {course.creator} | Submitted: {course.submittedDate}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = `/course-detail/${course.id}`)
                }
              >
                View Details
              </Button>
              <div className="flex gap-2">
                {type === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        approveRejectMutation.mutate({
                          courseId: course.id,
                          action: "reject",
                        })
                      }
                      disabled={approveRejectMutation.isPending}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        approveRejectMutation.mutate({
                          courseId: course.id,
                          action: "approve",
                        })
                      }
                      disabled={approveRejectMutation.isPending}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
                {type === "published" && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        approveRejectMutation.mutate({
                          courseId: course.id,
                          action: "reject",
                        })
                      }
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setCourseToDelete(course);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
                {type === "rejected" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        approveRejectMutation.mutate({
                          courseId: course.id,
                          action: "approve",
                        })
                      }
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setCourseToDelete(course);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Course Approval
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review and manage submitted courses
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isPendingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              renderCourses(pendingCourses, "pending")
            )}
          </TabsContent>

          <TabsContent value="published">
            {isPublishedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              renderCourses(publishedCourses, "published")
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {isRejectedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              renderCourses(rejectedCourses, "rejected")
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete course{" "}
              <span className="font-semibold">{courseToDelete?.title}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              No
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
