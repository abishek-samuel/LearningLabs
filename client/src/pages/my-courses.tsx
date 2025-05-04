import React, { useState, useMemo, useEffect } from "react"; // Import React for memo
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ArrowRight, Clock, BookOpen, CheckCircle, Loader2, ChevronDown, Star, MessageSquareWarning, Edit3, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Ensure this path is correct
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Types (Assuming these match your Prisma schema / API response) ---
type CourseInEnrollment = {
  id: number;
  title: string;
  description?: string | null;
  duration?: number | null;
  modules?: { id: number }[] | null;
  instructor?: { firstName?: string | null; lastName?: string | null; } | null;
  categoryId?: number | null;
};

type EnrollmentWithCourse = {
  id: number;
  userId: number;
  courseId: number;
  enrolledAt: string;
  completedAt?: string | null;
  progress: number | null;
  course?: CourseInEnrollment | null;
};

type Category = {
  id: number;
  name: string;
};

type Review = {
  id: number;
  stars: number;
  comment?: string | null;
  courseId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    name?: string;
    profilePicture?: string | null;
  } | null;
};
// --- End Types ---


// --- Memoized Review Form Component ---
// Define props the form component will receive
interface ReviewFormProps {
  existingReview: Review | null | undefined;
  fetchReviewError: Error | null;
  currentRating: number;
  currentComment: string;
  isProcessing: boolean; // Combined fetching/mutating state
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
}

// Create the memoized component
const MemoizedReviewForm = React.memo(({
  existingReview,
  fetchReviewError,
  currentRating,
  currentComment,
  isProcessing,
  onRatingChange,
  onCommentChange,
}: ReviewFormProps) => {

  // Star rendering logic, now part of this component
  const renderStars = (interactive = true) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={interactive ? () => onRatingChange(star) : undefined} // Use prop callback
            className={cn(
              "p-1.5 rounded-full transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-yellow-500",
              interactive ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:scale-110 active:scale-100 cursor-pointer' : 'cursor-default',
              isProcessing ? 'opacity-60 pointer-events-none' : ''
            )}
            disabled={!interactive || isProcessing}
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

  // Return the JSX structure of the form
  return (
    <div className="space-y-6">
      {/* Edit Information Alert */}
      {existingReview && !fetchReviewError && (
        <Alert variant="info" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300 font-medium">Editing Previous Review</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
            Last updated on {existingReview.updatedAt ? new Date(existingReview.updatedAt).toLocaleDateString() : 'N/A'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Rating Section */}
      <div className="space-y-2">
        <Label htmlFor="rating" className="text-base font-semibold flex items-center text-slate-800 dark:text-slate-100">
          Your Rating <span className="text-red-500 ml-1">*</span>
        </Label>
        <div className="p-3 bg-white dark:bg-slate-700/50 rounded-md border dark:border-slate-600/50 shadow-sm">
          {renderStars(true)} {/* Uses props */}
        </div>
        {/* Validation hint shown dynamically based on prop */}
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
          value={currentComment} // Uses prop
          onChange={(e) => onCommentChange(e.target.value)} // Uses prop callback
          className="min-h-[120px] text-sm focus:ring-primary dark:bg-slate-700/50 border dark:border-slate-600/50 shadow-sm rounded-md"
          placeholder="Share your experience... What did you like or dislike? How could it be improved?"
          rows={5}
          disabled={isProcessing} // Uses prop
          aria-label="Review comment"
        />
      </div>
    </div>
  );
});
// --- End Memoized Review Form Component ---


// --- MyCourses Component ---
export default function MyCourses() {
  const { user } = useAuth();
  const [locationPath, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- State ---
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedCourseForReview, setSelectedCourseForReview] = useState<CourseInEnrollment | null>(null);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [currentComment, setCurrentComment] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [activeTab, setActiveTab] = useState('inProgress');
  // --- End State ---

  // --- Base Data Fetching ---
  const { data: enrollments = [], isLoading: enrollmentsLoading, error: enrollmentsError } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch('/api/enrollments');
      if (!res.ok) throw new Error('Failed to fetch enrollments');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
  // --- End Base Data Fetching ---

  // --- Query for Existing Review ---
  const { data: existingReview, error: fetchReviewError, isFetching: isFetchingReview } = useQuery<Review | null>({
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
          return res.json() as Promise<Review>;
      },
      enabled: isReviewModalOpen && !!selectedCourseForReview?.id && !!user?.id,
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
          console.error("Error caught by useQuery onError:", error);
          toast({ title: "Error Loading Review", description: `Could not load previous data: ${error.message}`, variant: "destructive" });
          // Don't reset state here, let useEffect handle it based on error status
      }
      // NO onSuccess needed here - useEffect handles state sync
  });

  // --- Effect to Sync Form State with Fetched Review Data ---
  useEffect(() => {
    if (isReviewModalOpen) {
      if (!isFetchingReview && !fetchReviewError) {
        // Data fetch completed successfully
        setCurrentRating(existingReview?.stars ?? 0);
        setCurrentComment(existingReview?.comment ?? "");
      } else if (fetchReviewError && !isFetchingReview) {
         // Error occurred and fetching stopped
         setCurrentRating(0);
         setCurrentComment("");
      }
      // While isFetchingReview is true, do nothing here, rely on initial reset
    }
  }, [isReviewModalOpen, isFetchingReview, existingReview, fetchReviewError]);
  // --- End Effect ---


  // --- Mutation to submit/update the review ---
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
        queryClient.invalidateQueries({ queryKey: ["myReview", variables.courseId, user?.id] });
        queryClient.invalidateQueries({ queryKey: ["reviewAverage", variables.courseId] });
        queryClient.invalidateQueries({ queryKey: ["reviews", variables.courseId] });
    },
    onError: (error) => {
        toast({
            title: "Submission Failed",
            description: error instanceof Error ? error.message : "Could not submit your review.",
            variant: "destructive",
        });
    },
  });
  // --- End Mutation ---

  // --- Filtering/Sorting Logic (with robust null checks) ---
  const availableCategoryIds = useMemo(() => {
    const categoryIds = new Set<number>();
    if (!Array.isArray(enrollments)) return [];
    enrollments.forEach(enrollment => {
      if (enrollment?.course?.categoryId != null) {
        categoryIds.add(enrollment.course.categoryId);
      }
    });
    return [...categoryIds];
  }, [enrollments]);

  const availableCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.filter(cat => cat?.id != null && availableCategoryIds.includes(cat.id));
  }, [categories, availableCategoryIds]);

  const filteredEnrollments = useMemo(() => {
    if (!Array.isArray(enrollments)) return [];
    return enrollments.filter(e => {
      const course = e?.course;
      if (!course) return false;
      const lowerSearch = searchQuery.toLowerCase();
      const title = course.title?.toLowerCase() ?? '';
      const description = course.description?.toLowerCase() ?? '';
      const matchesSearch = !searchQuery || title.includes(lowerSearch) || description.includes(lowerSearch);
      const matchesCategory = category === "all" || (course.categoryId != null && course.categoryId.toString() === category);
      return matchesSearch && matchesCategory;
    });
  }, [enrollments, searchQuery, category]);

  const sortedEnrollments = useMemo(() => {
    if (!Array.isArray(filteredEnrollments)) return [];
    return [...filteredEnrollments].sort((a, b) => {
      const titleA = a?.course?.title?.toLowerCase() || '';
      const titleB = b?.course?.title?.toLowerCase() || '';
      const dateA = a?.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const dateB = b?.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      const validDateA = !isNaN(dateA) ? dateA : -Infinity;
      const validDateB = !isNaN(dateB) ? dateB : -Infinity;

      switch (sortOrder) {
        case "newest": return validDateB - validDateA;
        case "oldest": return validDateA - validDateB;
        case "az": return titleA.localeCompare(titleB);
        case "za": return titleB.localeCompare(titleA);
        default: return 0;
      }
    });
  }, [filteredEnrollments, sortOrder]);

  const completedCourses = useMemo(() => sortedEnrollments.filter(e => e?.course && (e.progress === 100 || !!e.completedAt)), [sortedEnrollments]);
  const inProgressCourses = useMemo(() => sortedEnrollments.filter(e => e?.course && !(e.progress === 100 || !!e.completedAt)), [sortedEnrollments]);
  // --- End Filtering/Sorting Logic ---

  // --- Effects and Handlers ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setActiveTab(urlParams.get('tab') === 'completed' ? 'completed' : 'inProgress');
    }
  }, []); // Run only on mount

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname || '/my-courses';
        const newUrl = value === 'completed' ? `${currentPath}?tab=completed` : currentPath;
        window.history.pushState({}, '', newUrl);
      }
  };

  const handleOpenReviewModal = (course: CourseInEnrollment | null | undefined) => {
    if (!course?.id) {
        console.error("Cannot open review modal: Invalid course data provided.");
        toast({title: "Error", description: "Could not open review modal for this course.", variant:"destructive"});
        return;
    }
    setSelectedCourseForReview(course);
    // Reset state immediately when opening. useEffect will handle populating from fetch.
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
  }
  // --- End Effects and Handlers ---

  const isLoading = enrollmentsLoading || categoriesLoading;
  const error = enrollmentsError;

  // --- Helpers ---
  const getInstructorName = (instructor: CourseInEnrollment['instructor'] | null | undefined) => {
    if (!instructor) return 'N/A';
    const firstName = instructor.firstName ?? '';
    const lastName = instructor.lastName ?? '';
    return `${firstName} ${lastName}`.trim() || 'N/A';
  };

  const formatDuration = (durationMinutes: number | null | undefined) => {
      if (durationMinutes == null || durationMinutes <= 0) return 'N/A';
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      return parts.join(' ') || '0m';
  };
  // --- End Helpers ---


  // --- Main Component Return ---
  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Learning</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your enrolled courses, progress, and completed learning journeys.
              </p>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search courses..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                    <select
                        className="w-full sm:w-auto appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        aria-label="Sort courses"
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="oldest">Sort: Oldest</option>
                        <option value="az">Sort: A-Z</option>
                        <option value="za">Sort: Z-A</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                <div className="relative">
                    <select
                        className="w-full sm:w-auto appearance-none rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={categoriesLoading || availableCategories.length === 0}
                        aria-label="Filter by category"
                    >
                        <option value="all">All Categories</option>
                        {availableCategories.map(cat => (cat?.id != null &&
                          <option key={cat.id} value={cat.id.toString()}>
                            {cat.name ?? 'Unnamed Category'}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
            </div>
        </div>
        {/* End Search and Filter */}

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2">
                <TabsTrigger value="inProgress" className="flex-1 sm:flex-none data-[state=active]:shadow-sm">In Progress ({inProgressCourses.length})</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 sm:flex-none data-[state=active]:shadow-sm">Completed ({completedCourses.length})</TabsTrigger>
            </TabsList>

            {/* Loading State for Enrollments */}
            {isLoading && (
             <div className="flex justify-center items-center py-16">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
               <span className="ml-3 text-slate-500">Loading your courses...</span>
             </div>
            )}

            {/* Error State for Enrollments */}
            {!isLoading && error && (
             <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 my-6">
                <CardHeader className="flex flex-row items-center space-x-3">
                    <MessageSquareWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <CardTitle className="text-red-700 dark:text-red-300">Loading Error</CardTitle>
                </CardHeader>
                <CardContent className="text-red-600 dark:text-red-400">
                    <p>We couldn't load your course enrollments. Please check your connection and try again.</p>
                    {error instanceof Error && <p className="text-xs mt-2">Details: {error.message}</p>}
                </CardContent>
             </Card>
            )}

            {/* Content (Render only if not loading and no error) */}
            {!isLoading && !error && (
            <>
              {/* In Progress Tab Content */}
              <TabsContent value="inProgress" className="focus:outline-none">
                    {inProgressCourses.length === 0 ? (
                      <div className="text-center py-16">
                        <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No courses in progress</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Courses you're currently taking will appear here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inProgressCourses.map((enrollment) => (enrollment?.id != null &&
                          <Card key={enrollment.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-lg line-clamp-2">{enrollment.course?.title ?? 'Course Title Missing'}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3 pt-0">
                                <div>
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
                                        <span>Progress</span>
                                        <span className="font-semibold">{enrollment.progress ?? 0}%</span>
                                    </div>
                                    <Progress value={enrollment.progress ?? 0} aria-label={`${enrollment.progress ?? 0}% complete`} className="h-2" />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t dark:border-slate-700 pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{formatDuration(enrollment.course?.duration)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        <span>{enrollment.course?.modules?.length ?? 0} modules</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 dark:bg-slate-800/50 p-4 mt-auto">
                               <Button size="sm" className="w-full bg-primary dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => navigate(`/course-content?id=${enrollment.courseId}`)}>
                                Continue Learning
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
              </TabsContent>

              {/* Completed Tab Content */}
              <TabsContent value="completed" className="focus:outline-none">
                   {completedCourses.length === 0 ? (
                      <div className="text-center py-16">
                        <CheckCircle className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No completed courses</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Courses you've finished will show up here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {completedCourses.map((enrollment) => (enrollment?.id != null &&
                          <Card key={enrollment.id} className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                               <CardHeader className="pb-4">
                                   <div className="flex justify-between items-start gap-2">
                                       <CardTitle className="text-lg line-clamp-2">{enrollment.course?.title ?? 'Course Title Missing'}</CardTitle>
                                       <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full flex-shrink-0">
                                           <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                       </div>
                                   </div>
                                    <p className="text-xs text-green-600 dark:text-green-400 pt-1">
                                       Completed on: {enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                               </CardHeader>
                               <CardContent className="flex-grow space-y-3 pt-0">
                                   <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t dark:border-slate-700 pt-3">
                                       <div className="flex items-center gap-1.5">
                                           <Clock className="h-3.5 w-3.5" />
                                           <span>{formatDuration(enrollment.course?.duration)}</span>
                                       </div>
                                       <div className="flex items-center gap-1.5">
                                           <BookOpen className="h-3.5 w-3.5" />
                                           <span>{enrollment.course?.modules?.length ?? 0} modules</span>
                                       </div>
                                   </div>
                                   <div className="text-xs text-slate-500 dark:text-slate-400">
                                       Instructor: <span className="font-medium">{getInstructorName(enrollment.course?.instructor)}</span>
                                   </div>
                               </CardContent>
                               <CardFooter className="bg-slate-50 dark:bg-slate-800/50 p-4 mt-auto grid grid-cols-2 gap-2">
                                   <Button size="sm" variant="outline" onClick={() => navigate(`/course-content?id=${enrollment.courseId}`)}>
                                     View Course
                                   </Button>
                                   <Button
                                     variant="default"
                                     size="sm"
                                     className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700"
                                     onClick={() => handleOpenReviewModal(enrollment.course)}
                                     disabled={!enrollment.course}
                                   >
                                    Review Course
                                   </Button>
                               </CardFooter>
                             </Card>
                        ))}
                      </div>
                    )}
              </TabsContent>
            </>
          )}
        </Tabs>
        {/* --- End Tabs Section --- */}

      </div> {/* End Main Content Area div */}


      {/* --- Review Dialog --- */}
        <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
            <DialogContent className="sm:max-w-lg rounded-lg shadow-xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <DialogTitle className="text-lg font-semibold flex items-center">
                        {/* Show icon only if review exists and is not currently fetching */}
                        {existingReview && !isFetchingReview && <Edit3 className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />}
                        {/* Determine title based on review existence and fetch state */}
                        {(existingReview && !isFetchingReview) ? 'Edit Your Review for:' : 'Leave a Review for:'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 pt-0.5 !mt-0 font-medium">
                      {selectedCourseForReview?.title ?? 'Course'}
                    </DialogDescription>
                </DialogHeader>

                {/* Main Content Area for Dialog */}
                <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
                    {/* Loading State - Show only during initial fetch, not refetch */}
                    {isFetchingReview && !existingReview && !fetchReviewError && (
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

                    {/* Form Area - Render if NOT initially loading OR if there was an error */}
                    {/* Pass necessary props down to the memoized ReviewForm */}
                    {/* This ensures the form is always rendered once loading finishes or errors out */}
                    {(!isFetchingReview || fetchReviewError) && (
                       <MemoizedReviewForm // Use the memoized component
                          existingReview={existingReview}
                          fetchReviewError={fetchReviewError}
                          currentRating={currentRating}
                          currentComment={currentComment}
                          isProcessing={isFetchingReview || reviewMutation.isPending}
                          onRatingChange={setCurrentRating} // Pass setter function
                          onCommentChange={setCurrentComment} // Pass setter function
                       />
                    )}
                </div>
                {/* End Main Content Area for Dialog */}

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
                        // Disable if no rating OR any mutation/fetch is in progress
                        disabled={currentRating === 0 || reviewMutation.isPending || isFetchingReview}
                        className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 mt-2 sm:mt-0 min-w-[120px]"
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (existingReview && !isFetchingReview ? <Edit3 className="mr-2 h-4 w-4" /> : null)}
                      {/* Determine button text based on review data state (available after fetch) */}
                      {reviewMutation.isPending ? 'Saving...' : (existingReview && !isFetchingReview ? 'Update Review' : 'Submit Review')}
                    </Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>
      {/* --- End Review Dialog --- */}

    </MainLayout>
  ); // End Main Component Return

} // End of MyCourses component

// --- Export Type if needed ---
// If Review type is defined outside or globally, this export is not needed here.
// If it's only defined above, export it for the MemoizedReviewForm import.
export type { Review };