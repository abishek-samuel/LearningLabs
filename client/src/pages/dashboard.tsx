import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Info, Loader2, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CourseCard } from "@/components/dashboard/course-card";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { queryClient } from "../lib/queryClient";
import {
  Filter,
  BookOpen,
  CheckSquare,
  Clock,
  Medal,
  Video,
  Award,
  FileText,
  Activity,
  ClipboardCheck,
  UserPlus,
  CheckCircle,
  Star,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Added cn import - assumption
import { Skeleton } from "@/components/ui/skeleton"; // Ensure Skeleton is imported


interface CourseInEnrollment {
  id: number;
  courseId: number;
  course: {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    rating: number;
    instructor: {
      firstName?: string;
      lastName?: string;
    } | null | undefined;
  };
  progress: number;
  completedAt?: string | null;
}

// Add these type definitions
type RecommendedCourseApi = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  rating?: number | null;
};

type RecommendationsApiResponse = {
  recommendedCourses: RecommendedCourseApi[];
};

// Add this constant
const DEFAULT_COURSE_THUMBNAIL_URL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80";


export function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse flex flex-col h-full"> {/* Match Card usage */}
      {/* Image Area Skeleton */}
      <Skeleton className="aspect-[16/9] w-full bg-slate-200 dark:bg-slate-700" /> {/* Aspect ratio like the image */}

      {/* Content Area Skeleton */}
      <CardContent className="p-4 flex-grow flex flex-col"> {/* Match padding, flex for button positioning */}
        {/* Title Skeleton */}
        <Skeleton className="h-5 w-3/4 mb-1" />
        {/* Description Skeleton (approx 2 lines) */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6 mb-3" /> {/* Slightly shorter second line */}

        {/* Footer/Button Area Skeleton */}
        <div className="mt-auto pt-2"> {/* Pushes button skeleton to bottom */}
           {/* Rating Skeleton (Optional, can be added if needed) */}
           {/* <Skeleton className="h-4 w-1/4 mb-2" /> */}
           <Skeleton className="h-9 w-full rounded-md" /> {/* Button Skeleton */}
        </div>
      </CardContent>
    </Card>
  );
}


export default function Dashboard() {
  const { user } = useAuth();
  const currentDate = format(new Date(), "MMMM d, yyyy");
  const [, navigate] = useLocation();
  const queryClient1 = useQueryClient();
  const { toast } = useToast();

  const [selectedCourseForReview, setSelectedCourseForReview] = useState<CourseInEnrollment | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentComment, setCurrentComment] = useState("");
  // const [isFetchingReview, setIsFetchingReview] = useState(false);

  useEffect(() => {
    queryClient1.invalidateQueries({ queryKey: ["/api/enrollments"] });
  }, []);

  useEffect(() => {
    queryClient1.invalidateQueries({ queryKey: ["/api/activity-logs"] });
  }, []);

  // Fetch Recommended Courses
  const {
    data: recommendationsApiResponse,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
  } = useQuery<RecommendationsApiResponse>({
    queryKey: ["recommendations"], // General recommendations key
    queryFn: async () => {
      const response = await fetch('/api/recommendations');
      if (!response.ok) {
        console.error("Failed to fetch recommendations:", response.statusText);
        // Return default structure on error to prevent breaking UI
        return { recommendedCourses: [] };
      }
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
  });

  // Derive recommendedCourses, defaulting to an empty array
  const recommendedCourses = recommendationsApiResponse?.recommendedCourses || [];

  // Fetch enrollments for the current user
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["/api/enrollments"],
    enabled: !!user,
  });

  // Fetch activity logs for the current user
  const { data: activityLogs, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
    enabled: !!user,
  });

  // In a real app, we would use these values from the API
  const statsData = {
    enrolled: enrollments?.length || 0,
    completed: enrollments?.filter((e) => e.completedAt)?.length || 0,
    inProgress: enrollments?.filter((e) => !e.completedAt)?.length || 0,
    certificates: enrollments?.filter((e) => e.completedAt)?.length || 0,
  };

  // Mock data for demo purposes - in a real application, this would come from API
  const inProgressCourses =
    enrollments?.filter((e: any) => e.progress < 100).slice(0, 3) || [];

  const completedCourses =
    enrollments?.filter((e: any) => e.progress === 100) || [];
  const getInstructorName = (
    instructor: CourseInEnrollment["instructor"] | null | undefined,
  ) => {
    if (!instructor) return "N/A";
    const firstName = instructor.firstName ?? "";
    const lastName = instructor.lastName ?? "";
    return `${firstName} ${lastName}`.trim() || "N/A";
  };

  const formatDuration = (durationMinutes: number | null | undefined) => {
    if (durationMinutes == null || durationMinutes <= 0) return "N/A";
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ") || "0m";
  };

  // Review Mutation (Placeholder - needs actual implementation)
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: { courseId: number; stars: number; comment: string }) => {
      const res = await fetch(`/api/courses/${reviewData.courseId}/reviews`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars: reviewData.stars, comment: reviewData.comment }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Request failed with status ${res.status}` }));
        throw new Error(errorData.message || `Failed to submit review`);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
      setIsReviewModalOpen(false);
      queryClient1.invalidateQueries({ queryKey: ["myReview", variables.courseId, user?.id] });
      queryClient1.invalidateQueries({ queryKey: ["reviewAverage", variables.courseId] });
      queryClient1.invalidateQueries({ queryKey: ["reviews", variables.courseId] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not submit your review.",
        variant: "destructive",
      });
    }
  });


  // Review query
  const { data: existingReviewData, error: fetchReviewError, isFetching: isFetchingReview } = useQuery({
    queryKey: ["myReview", selectedCourseForReview?.id, user?.id],
    queryFn: async () => {
      const courseId = selectedCourseForReview?.id;
      const userId = user?.id;
      if (!courseId || !userId) return null;
      const res = await fetch(`/api/courses/${courseId}/reviews/my-review`);
      if (!res.ok) {
        if (res.status === 404) return null;
        const errorText = await res.text();
        console.error(`Failed to fetch existing review: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to check for existing review (${res.status})`);
      }
      return res.json();
    },
    enabled: isReviewModalOpen && !!selectedCourseForReview?.id && !!user?.id,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Effect to sync form state with fetched review data
  useEffect(() => {
    if (isReviewModalOpen) {
      if (!isFetchingReview && !fetchReviewError) {
        setCurrentRating(existingReviewData?.stars ?? 0);
        setCurrentComment(existingReviewData?.comment ?? "");
      } else if (fetchReviewError && !isFetchingReview) {
        setCurrentRating(0);
        setCurrentComment("");
      }
    }
  }, [isReviewModalOpen, isFetchingReview, existingReviewData, fetchReviewError]);

  const handleOpenReviewModal = (course: CourseInEnrollment | null | undefined) => {
    if (!course?.id) {
      console.error("Cannot open review modal: Invalid course data provided.");
      toast({ title: "Error", description: "Could not open review modal for this course.", variant: "destructive" });
      return;
    }
    setSelectedCourseForReview(course);
    setCurrentRating(0);
    setCurrentComment("");
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = () => {
    const courseId = selectedCourseForReview?.id;
    if (!courseId) {
      toast({ title: "Error", description: "Cannot submit review for unknown course.", variant: "destructive" });
      return;
    }
    if (currentRating === 0) {
      toast({ title: "Missing Rating", description: "Please select a star rating (1-5).", variant: "destructive" });
      return;
    }
    if (reviewMutation.isPending) return;
    reviewMutation.mutate({
      courseId: courseId,
      stars: currentRating,
      comment: currentComment.trim(),
    });
  };

  const renderStars = (interactive = true) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => setCurrentRating(star) : undefined}
            className={cn(
              "p-1.5 rounded-full transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-yellow-500",
              interactive ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:scale-110 active:scale-100 cursor-pointer' : 'cursor-default',
              isFetchingReview ? 'opacity-60 pointer-events-none' : ''
            )}
            disabled={!interactive || isFetchingReview}
            aria-label={`Rate ${star} out of 5 stars`}
            aria-pressed={interactive ? star === currentRating : undefined}
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors duration-150 ease-in-out",
                (currentRating ?? 0) >= star
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-slate-300 dark:text-slate-500'
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      {/* Review Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg shadow-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <DialogTitle className="text-lg font-semibold flex items-center">
              {/* Show icon only if review exists and is not currently fetching */}
              {existingReviewData && !isFetchingReview && <Edit3 className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />}
              {/* Determine title based on review existence and fetch state */}
              {(existingReviewData && !isFetchingReview) ? 'Edit Your Review for:' : 'Leave a Review for:'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 pt-0.5 !mt-0 font-medium">
              {selectedCourseForReview?.course?.title ?? 'Course'}
            </DialogDescription>
          </DialogHeader>

          {/* Main Content Area for Dialog */}
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* Loading State - Show only during initial fetch, not refetch */}
            {isFetchingReview && !existingReviewData && !fetchReviewError && (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span>Loading your previous review...</span>
              </div>
            )}

            {/* Error State during Fetch */}
            {fetchReviewError && (
              <Alert variant="destructive" className="mb-5">
                <MessageSquareWarning className="h-4 w-4" />
                <AlertTitle>Error Loading Review</AlertTitle>
                <AlertDescription>
                  {`Could not load previous data (${fetchReviewError.message}). You can still submit a new review below.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Form Area */}
            {(!isFetchingReview || fetchReviewError) && (
              <div className="space-y-6">
                {/* Edit Information Alert */}
                {existingReviewData && !fetchReviewError && (
                  <Alert variant="info" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300 font-medium">Editing Previous Review</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
                      Last updated on {existingReviewData.updatedAt ? new Date(existingReviewData.updatedAt).toLocaleDateString() : 'N/A'}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Rating Section */}
                <div className="space-y-2">
                  <Label htmlFor="rating" className="text-base font-semibold flex items-center text-slate-800 dark:text-slate-100">
                    Your Rating <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="p-3 bg-white dark:bg-slate-700/50 rounded-md border dark:border-slate-600/50 shadow-sm">
                    {renderStars(true)}
                  </div>
                  {currentRating === 0 && (
                    <p className="text-xs text-red-500 dark:text-red-400 pl-1">Please select a rating from 1 to 5 stars.</p>
                  )}
                </div>

                {/* Comment Section */}
                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    Your Review <span className="text-slate-500 text-sm font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="comment"
                    value={currentComment}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    className="min-h-[120px] text-sm focus:ring-primary dark:bg-slate-700/50 border dark:border-slate-600/50 shadow-sm rounded-md"
                    placeholder="Share your experience... What did you like or dislike? How could it be improved?"
                    rows={5}
                    disabled={isFetchingReview || reviewMutation.isPending}
                    aria-label="Review comment"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t dark:border-slate-700 sm:justify-between rounded-b-lg">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={reviewMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleReviewSubmit}
              disabled={currentRating === 0 || reviewMutation.isPending || isFetchingReview}
              className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 mt-2 sm:mt-0 min-w-[120px]"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (existingReviewData && !isFetchingReview ? <Edit3 className="mr-2 h-4 w-4" /> : null)}
              {reviewMutation.isPending ? 'Saving...' : (existingReviewData && !isFetchingReview ? 'Update Review' : 'Submit Review')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dashboard header */}
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl dark:text-white">
              Dashboard
            </h1>
            <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="mt-2 flex items-center text-sm text-slate-500 dark:text-slate-400">
                <svg
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
              </div>
              <div className="mt-2 flex items-center text-sm text-slate-500 dark:text-slate-400">
                <svg
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                {currentDate}
              </div>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <Button
              variant="outline"
              onClick={() => navigate("/course-catalog")}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Explore Courses
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Enrolled Courses"
            value={statsData.enrolled}
            icon={BookOpen}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            linkText="View all"
            linkHref="/my-courses"
          />

          <StatsCard
            title="Completed"
            value={statsData.completed}
            icon={CheckSquare}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            linkText="View all"
            linkHref="/my-courses?tab=completed"
          />

          <StatsCard
            title="In Progress"
            value={statsData.inProgress}
            icon={Clock}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
            iconColor="text-yellow-600 dark:text-yellow-400"
            linkText="Continue learning"
            linkHref="/my-courses"
          />

          <StatsCard
            title="Certificates"
            value={statsData.certificates}
            icon={Medal}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            linkText="View all"
            linkHref="/certificates"
          />
        </div>

        {/* In progress section */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Continue Learning
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {enrollmentsLoading ? (
            <div className="col-span-3 flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : inProgressCourses.length > 0 ? (
            inProgressCourses.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                id={enrollment.courseId}
                title={enrollment.course.title}
                description={enrollment.course.description}
                thumbnailUrl={enrollment.course.thumbnail}
                progress={enrollment.progress}
                rating={enrollment.course.rating}
                isInProgress={true}
              />
            ))
          ) : (
            <div className="col-span-3 text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow">
              <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                No courses in progress
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Start learning by enrolling in a course.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate("/course-catalog")}>
                  Browse Courses
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:flex lg:gap-x-3">
          {/* 60% width container */}
          {/* <div className="lg:w-3/4 w-full"> */}
          <div className="lg:w-[60%] w-full">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Completed Courses
              </h2>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                {completedCourses.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      No completed courses
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Courses you've finished will show up here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {completedCourses.slice(0, 3).map((enrollment) => (
                        <div key={enrollment.id} className="p-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                                <CheckCircle className="text-green-600 dark:text-green-400 w-5 h-5" />
                              </div>
                              <div className="ml-4">
                                <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                                  {enrollment.course?.title ??
                                    "Course Title Missing"}
                                </h3>

                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Instructor:{" "}
                                  <span className="font-medium">
                                    {getInstructorName(
                                      enrollment.course?.instructor,
                                    )}
                                  </span>
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 pt-1">
                                  Completed on:{" "}
                                  {enrollment.completedAt
                                    ? new Date(
                                      enrollment.completedAt,
                                    ).toLocaleDateString()
                                    : "N/A"}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(
                                    `/course-content?id=${enrollment.courseId}`,
                                  )
                                }
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700"
                                onClick={() =>
                                  handleOpenReviewModal(enrollment)
                                }
                                disabled={!enrollment.course}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6">
                      <div className="text-sm">
                        <a
                          href="#"
                          onClick={() => navigate("/my-courses?tab=completed")}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                        >
                          View all completed courses
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 40% width container */}
          <div className="lg:w-[40%] w-full">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {activitiesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    </div>
                  ) : activityLogs && activityLogs.length > 0 ? (
                    activityLogs.slice(0, 3).map((activity) => {
                      let icon, iconBgColor, iconColor, title;

                      switch (activity.action) {
                        case "watched_video":
                          icon = Video;
                          iconColor = "text-blue-600 dark:text-blue-400";
                          title = `Watched "${activity.metadata?.title || "Video"}"`;
                          break;

                        case "completed_lesson":
                          icon = CheckSquare;
                          iconColor = "text-green-600 dark:text-green-400";
                          title = `Completed lesson: "${activity.metadata?.title || "Lesson"}"`;
                          break;

                        case "completed_assessment":
                          icon = ClipboardCheck;
                          iconColor = "text-green-600 dark:text-green-400";
                          title = `Completed assessment: "${activity.metadata?.title || "Assessment"}"`;
                          break;

                        case "enrolled":
                          icon = UserPlus;
                          iconColor = "text-teal-600 dark:text-teal-400";
                          title = `Enrolled in "${activity.metadata?.title || "Course"}"`;
                          break;

                        case "earned_badge":
                          icon = Award;
                          iconColor = "text-purple-600 dark:text-purple-400";
                          title = `Earned "${activity.metadata?.title || "Badge"}"`;
                          break;

                        default:
                          icon = Activity;
                          iconColor = "text-slate-600 dark:text-slate-400";
                          title = `Performed action: ${activity.action}`;
                          break;
                      }

                      return (
                        <ActivityItem
                          key={activity.id}
                          icon={icon}
                          iconColor={iconColor}
                          title={title}
                          subtitle={activity.metadata.courseName || ""}
                          timestamp={new Date(activity.createdAt)}
                        />
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No recent activity
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
                  <div className="text-sm">
                    <a
                      href="#"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                    >
                      View activity log
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended courses */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">
          Recommended for You
        </h2>
        {/* Conditional Rendering based on fetch state */}
        {isLoadingRecommendations && (
            // Loading State: Show Skeletons
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <CourseCardSkeleton />
                ))}
            </div>
        )}
        {!isLoadingRecommendations && recommendationsError && (
            // Error State
            <div className="text-center py-6 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p>Could not load recommendations at this time.</p>
                {/* Optionally show error message: {recommendationsError.message} */}
            </div>
        )}
        {!isLoadingRecommendations && !recommendationsError && recommendedCourses.length === 0 && (
            // Empty State
             <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow">
                <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No recommendations right now</h3>
                <p className="mt-1 text-sm">Keep learning to get personalized suggestions!</p>
            </div>
        )}
        {!isLoadingRecommendations && !recommendationsError && recommendedCourses.length > 0 && (
            // Success State: Display fetched courses
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedCourses.map((courseRec: RecommendedCourseApi) => (
                <CourseCard
                    key={courseRec.id}
                    id={courseRec.id}
                    title={courseRec.title}
                    description={courseRec.description || ""}
                    thumbnailUrl={courseRec.thumbnail || DEFAULT_COURSE_THUMBNAIL_URL}
                    rating={courseRec.rating || 0} // Pass rating (CourseCard should handle null)
                    isInProgress={false} // Recommended are not in progress
                />
            ))}
            </div>
        )}
        {/* End Recommended Courses Section */}
      </div>
    </MainLayout>
  );
}
