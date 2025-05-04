import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator"; // Keep original import
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link, useRoute } from "wouter";
import { Play, Clock, Users, BookOpen, Star as StarIcon, Flag, Award, ArrowLeft, MessageSquare, Calendar, PlayCircle, FileText, ClipboardCheck, Loader2, MessageCircle, CheckCircle } from "lucide-react"; // Added CheckCircle
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- Types ---
type Instructor = {
  id: number;
  name: string;
  avatar: string;
  title?: string | null;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};
type Lesson = {
  id: number;
  title: string;
  duration?: string | number | null;
  type?: string;
  completed?: boolean;
  questions?: number;
  videoUrl?: string | null;
  content?: string | null;
  position: number;
};
type Module = {
  id: number;
  title: string;
  description?: string | null;
  lessons: Lesson[];
  position: number;
};
// Updated Course Type (removed hardcoded rating/reviews)
type Course = {
  id: number;
  title: string;
  description?: string | null;
  instructor?: Instructor | null;
  modules: Module[];
  duration?: string | null;
  level?: string | null;
  updatedAt: string;
  lastUpdated: string;
  progress: number;
  prerequisites?: string[] | null;
  objectives?: string[] | null;
  difficulty?: string | null;
};

type LessonProgress = { lessonId: number; status: string; };

// Add Review Types
type ReviewUser = {
  id: number;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};

type Review = {
  id: number;
  stars: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
  user: ReviewUser;
};

type AverageRatingResponse = {
  averageRating: number;
  reviewCount: number;
};
// --- End Types ---

// --- StarRatingDisplay Component ---
const StarRatingDisplay = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => {
    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const halfStar = roundedRating % 1 !== 0;
    const displayFullStars = fullStars + (halfStar ? 1 : 0);

    return (
        <div className="flex items-center">
            {[...Array(displayFullStars)].map((_, i) => (
                <StarIcon key={`full-${i}`} className={cn(size, "text-yellow-400 fill-yellow-400")} />
            ))}
            {[...Array(5 - displayFullStars)].map((_, i) => (
                <StarIcon key={`empty-${i}`} className={cn(size, "text-slate-300 dark:text-slate-600")} />
            ))}
        </div>
    );
};
// --- End StarRatingDisplay Component ---


export default function CourseDetail() {
  const { user } = useAuth();
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["enrollments", user?.id], // Use specific key
     queryFn: async () => {
        if (!user) return [];
        const res = await fetch('/api/enrollments');
        if (!res.ok) { console.error("Failed fetch enrollments"); return []; }
        return res.json();
    },
    enabled: !!user,
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [match, params] = useRoute("/course-detail/:id");
  const courseId = params?.id;
  const [courseSummaries, setCourseSummaries] = useState([]);

  useEffect(() => {
    if (!courseId) return;

    fetch(`http://localhost:5001/api/course-summaries/${courseId}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Server responded with error: ${res.status} - ${text}`
          );
        }

        const data = await res.json();
        setCourseSummaries(data.summaries || []);
      })
      .catch((err) => {
        console.error("Error fetching course summaries:", err);
      });
  }, [courseId]);

  // Fetch Course Details
  const { data: course, isLoading: isLoadingCourse, error: courseError, isError: isCourseError } = useQuery<Course, Error>({
    queryKey: ["course", courseId],
    queryFn: async () => {
        if (!courseId) throw new Error("Course ID is required");
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error("Course not found");
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch course details: ${response.statusText}`);
        }
        const data = await response.json();
        // Process data WITHOUT hardcoded rating/reviews
        return {
            ...data,
            instructor: data.instructor ? {
                id: data.instructor.id,
                name: `${data.instructor.firstName || ''} ${data.instructor.lastName || ''}`.trim() || 'Instructor',
                avatar: data.instructor.profilePicture || `https://ui-avatars.com/api/?name=${data.instructor.firstName?.[0] || 'N'}+${data.instructor.lastName?.[0] || 'A'}`,
                title: data.instructor.title || 'Instructor',
                bio: data.instructor.bio || 'Bio not available',
                firstName: data.instructor.firstName, lastName: data.instructor.lastName, profilePicture: data.instructor.profilePicture,
            } : { id: 0, name: 'Unknown Instructor', avatar: '', title: '', bio: '' },
            lastUpdated: new Date(data.updatedAt).toLocaleDateString(),
            duration: data.duration ? (() => {
                const totalMinutes = Number(data.duration);
                if (isNaN(totalMinutes) || totalMinutes <= 0) return "N/A";
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
            })() : "N/A",
            level: data.difficulty ? data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1) : "All Levels",
            progress: data.progress ?? 0,
            prerequisites: data.prerequisites || [],
            objectives: data.objectives || [],
            modules: (data.modules || []).sort((a: Module, b: Module) => (a?.position ?? 0) - (b?.position ?? 0)).map((mod: Module) => ({
                ...mod,
                lessons: (mod.lessons || []).sort((a: Lesson, b: Lesson) => (a?.position ?? 0) - (b?.position ?? 0)).map((lesson: Lesson) => ({
                    ...lesson,
                    duration: lesson.duration ? `${Math.floor(Number(lesson.duration) / 60)}:${(Number(lesson.duration) % 60).toString().padStart(2, '0')}` : undefined
                }))
            }))
        };
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch Lesson Progress
  const { data: lessonProgressData = [], isLoading: isLoadingProgress } =
    useQuery<LessonProgress[]>({
      queryKey: ["lessonProgress", courseId, user?.id],
      queryFn: async () => {
        if (!courseId || !user?.id) return [];
        const response = await fetch(`/api/courses/${courseId}/progress`);
        if (!response.ok) {
          console.error(
            "Failed to fetch lesson progress:",
            response.statusText
          );
          return [];
        }
        return response.json();
      },
      enabled: !!courseId && !!user?.id,
      staleTime: 1 * 60 * 1000,
    });

  // Fetch Enrollment Count
   const { data: enrollmentCount = 0, isLoading: isLoadingEnrollmentCount } = useQuery<number>({
    queryKey: ["enrollmentCount", courseId],
    queryFn: async (): Promise<number> => {
        if (!courseId) return 0;
        try {
            const response = await fetch(`/api/courses/${courseId}/enrollments/count`);
            if (!response.ok) {
                console.error("Failed to fetch enrollment count:", response.statusText, await response.text().catch(()=>''));
                return 0;
            }
            const data: { count: number } = await response.json();
            return data.count ?? 0;
        } catch (error) {
             console.error("Error fetching enrollment count:", error);
             return 0;
        }
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Average Rating
  const { data: avgRatingData, isLoading: isLoadingAvgRating } = useQuery<AverageRatingResponse>({
    queryKey: ["reviewAverage", courseId],
    queryFn: async () => {
        if (!courseId) return { averageRating: 0, reviewCount: 0 };
        const response = await fetch(`/api/courses/${courseId}/reviews/average`);
        if (!response.ok) {
            console.error("Failed to fetch average rating:", response.statusText);
            return { averageRating: 0, reviewCount: 0 };
        }
        return response.json();
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
    placeholderData: { averageRating: 0, reviewCount: 0 },
  });

  // Fetch All Reviews
  const { data: reviewsData = [], isLoading: isLoadingReviews, error: reviewsError } = useQuery<Review[]>({
    queryKey: ["reviews", courseId],
    queryFn: async () => {
        if (!courseId) return [];
        const response = await fetch(`/api/courses/${courseId}/reviews`);
        if (!response.ok) {
            console.error("Failed to fetch reviews:", response.statusText);
            return [];
        }
        const data = await response.json();
        return (Array.isArray(data) ? data : []).map((review: any) => ({
            ...review,
            user: {
                id: review.user?.id ?? 0,
                name: `${review.user?.firstName ?? ''} ${review.user?.lastName ?? ''}`.trim() || 'Anonymous',
                firstName: review.user?.firstName,
                lastName: review.user?.lastName,
                profilePicture: review.user?.profilePicture || `https://ui-avatars.com/api/?name=${review.user?.firstName?.[0] || 'U'}+${review.user?.lastName?.[0] || 'A'}&background=random`,
            }
        }));
    },
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });

  // Create lesson completion map
  const lessonCompletionMap = useMemo(() => lessonProgressData.reduce((acc: Record<number, boolean>, p) => {
    if (p?.lessonId != null) {
        acc[p.lessonId] = p.status === 'completed';
    }
    return acc;
  }, {}), [lessonProgressData]);

  // Enrollment Mutation
  const enrollMutation = useMutation({
    mutationFn: async (courseIdToEnroll: number) => {
      if (!user) throw new Error("User not logged in");
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: courseIdToEnroll }),
      });
      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.message?.includes("Already enrolled")) {
            return { alreadyEnrolled: true };
          }
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to enroll: ${response.statusText}`
        );
      }
      return response.json();
    },
    onSuccess: (data, courseIdToEnroll) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["course", courseIdToEnroll.toString()] });
      queryClient.invalidateQueries({ queryKey: ["enrollmentCount", courseIdToEnroll.toString()] });

      if (course) {
        const firstModule = course.modules?.[0];
        const firstLesson = firstModule?.lessons?.[0];
        if (firstModule && firstLesson) {
          setLocation(
            `/course-content?id=${course.id}&moduleId=${firstModule.id}&lessonId=${firstLesson.id}`
          );
        } else {
          setLocation(`/course-content?id=${course.id}`);
        }
      } else {
         setLocation(`/my-courses`);
      }
    },
    onError: (error) => {
      toast({
        title: "Enrollment Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not enroll in the course.",
        variant: "destructive",
      });
    },
  });

  // --- Component logic ---
  const handleStartCourse = () => {
    // console.log("handleStartCourse triggered"); // DEBUG
    if (!course?.id || !user) {
      toast({ title: "Login Required", description: "Please log in to enroll.", variant: "destructive" });
      return;
    }
    if (enrollMutation.isPending) return;
    enrollMutation.mutate(course.id);
  };

  const handleContinueProgress = () => {
    // console.log("handleContinueProgress triggered"); // DEBUG
    if (!course?.id) {
        toast({ title: "Error", description: "Course data not available.", variant: "destructive" });
        return;
    };
    setLocation(`/course-content?id=${course.id}`);
  };

  const handleNavigateToLesson = (moduleId: number, lessonId: number) => {
    const isUserEnrolled = enrollments.some((e) => e?.courseId === course?.id);
    // console.log(`handleNavigateToLesson triggered: moduleId=${moduleId}, lessonId=${lessonId}, isEnrolled=${isUserEnrolled}`); // DEBUG
    if (!course?.id || !isUserEnrolled) {
        toast({ title: "Not Enrolled", description: "You need to enroll in this course to view lessons.", variant: "default" });
        return;
    }
    setLocation(`/course-content?id=${course.id}&moduleId=${moduleId}&lessonId=${lessonId}`);
  };

  const getLessonIcon = (lesson: Lesson) => {
    const isCompleted = lessonCompletionMap[lesson.id] ?? false;
    const type = lesson.type?.toLowerCase();
    if (type === 'assessment' || lesson.questions) return <ClipboardCheck className={cn("mr-3 h-5 w-5", isCompleted ? "text-green-500" : "text-slate-400")} />;
    if (type === 'video' || lesson.videoUrl) return <PlayCircle className={cn("mr-3 h-5 w-5", isCompleted ? "text-green-500" : "text-slate-400")} />;
    return <FileText className={cn("mr-3 h-5 w-5", isCompleted ? "text-green-500" : "text-slate-400")} />;
  };
  // --- End Component Logic ---

  // --- Render Logic ---
  const isLoading = isLoadingCourse || isLoadingEnrollmentCount || isLoadingAvgRating;

  if (isLoading && !course) {
    return (
      <MainLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto animate-pulse">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-6"> <Skeleton className="h-10 w-1/2" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> <Skeleton className="h-6 w-1/3 mt-4" /> <Skeleton className="h-72 w-full mt-6" /> </div>
             <div className="space-y-6"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-64 w-full" /> <Skeleton className="h-32 w-full" /> </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isCourseError || !course) {
    return (
      <MainLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600">Course Not Found</h1>
          <p className="mt-2 text-slate-500">{courseError?.message || "The course you are looking for could not be loaded."}</p>
          <Button onClick={() => setLocation('/course-catalog')} className="mt-4">Back to Catalog</Button>
        </div>
      </MainLayout>
    );
  }

  // --- Calculations for rendering ---
  const totalLessons = course.modules?.reduce((sum, module) => sum + (module?.lessons?.length || 0), 0) || 0;
  const completedLessonsCount = Object.values(lessonCompletionMap).filter(Boolean).length;
  const isEnrolled = enrollments.some((e) => e?.courseId === course.id);
  const displayRating = avgRatingData?.averageRating ?? 0;
  const displayReviewCount = avgRatingData?.reviewCount ?? 0;
  // --- End Calculations ---


  // --- Main Render ---
  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow"> {/* Reverted to original shadow */}
        <div className="px-4 sm:px-6 lg:px-8 py-6"> {/* Reverted padding/max-width */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <button
              onClick={() => setLocation("/my-courses")}
              className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </button>
          </div>
          <div className="md:flex md:items-start md:justify-between">
            <div className="min-w-0"> {/* Reverted flex-1 */}
              <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">{course.title}</h1> {/* Reverted font/tracking */}
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">{course.description}</p>
              {/* Header Meta Info */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"> {/* Reverted margin/gap */}
                <div className="flex items-center gap-1" title="Total Duration"><Clock className="h-4 w-4 text-slate-400" /><span>{course.duration}</span></div>
                <div className="flex items-center gap-1" title="Number of Lessons"><BookOpen className="h-4 w-4 text-slate-400" /><span>{totalLessons} lessons</span></div>
                <div className="flex items-center gap-1" title="Students Enrolled"><Users className="h-4 w-4 text-slate-400" /><span>{enrollmentCount.toLocaleString()} enrolled</span></div>
                 {/* ** MODIFICATION START: Use fetched rating data ** */}
                <div className="flex items-center gap-1" title={`Average Rating: ${displayRating.toFixed(1)} out of 5`}>
                    <StarRatingDisplay rating={displayRating} size="h-4 w-4"/> {/* Use component */}
                    <span className="font-medium">{displayRating.toFixed(1)}</span> {/* Keep original ml-1 if needed */}
                    <span className="text-slate-400">({displayReviewCount.toLocaleString()} reviews)</span>
                </div>
                 {/* ** MODIFICATION END: Use fetched rating data ** */}
                <div className="flex items-center gap-1" title="Difficulty Level"><Flag className="h-4 w-4 text-slate-400" /><span>{course.level}</span></div>
              </div>
              {/* End Header Meta Info */}
            </div>
            <div className="mt-4 flex gap-3 md:mt-0 md:ml-0"> {/* Reverted margin */}
              {/* Start/Continue Button */}
              {isEnrolled ? (
                // ** CORRECTED: Ensure onClick is passed **
                <Button onClick={handleContinueProgress} className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 text-white">Continue Course</Button>
              ) : (
                // ** CORRECTED: Ensure onClick is passed **
                <Button
                  onClick={handleStartCourse}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  {enrollMutation.isPending ? 'Enrolling...' : 'Start Course'}
                </Button>
              )}
              {/* End Start/Continue Button */}
            </div>
          </div>
        </div>
      </div>
      {/* End Header */}

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"> {/* Reverted gap */}
          {/* Left Column (Tabs) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="mb-6 w-full grid grid-cols-3"> {/* Reverted to original grid/border/style */}
                <TabsTrigger value="content" className="flex-1">Course Content</TabsTrigger>
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                 {/* ** MODIFICATION START: Add count to Reviews tab trigger ** */}
                <TabsTrigger value="reviews" className="flex-1">Reviews ({displayReviewCount})</TabsTrigger>
                 {/* ** MODIFICATION END: Add count to Reviews tab trigger ** */}
              </TabsList>

              {/* Course Content Tab */}
              <TabsContent value="content">
                 <Card> {/* Reverted border/shadow */}
                  <CardHeader><CardTitle>Course Curriculum</CardTitle><CardDescription>{course.modules?.length || 0} modules • {totalLessons} lessons • {course.duration} total length</CardDescription></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y dark:divide-slate-700"> {/* Reverted border */}
                      {/* Module mapping */}
                      {(course.modules || []).map((module: Module) => (module?.id != null &&
                        <div key={module.id} className="py-4 px-6"> {/* Reverted padding */}
                          {/* Module Header */}
                          <div className="mb-2"><h3 className="text-lg font-medium">{module.title}</h3><p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p></div>
                           {/* Lesson List */}
                          <div className="space-y-2 mt-3"> {/* Reverted spacing */}
                             {(module.lessons || [])
                               .slice()
                               .sort((a, b) => { // Use original sort logic
                                    if (a.type === 'assessment') return 1;
                                    if (b.type === 'assessment') return -1;
                                    return (a?.position ?? 0) - (b?.position ?? 0);
                                })
                               .map((lesson) => (lesson?.id != null &&
                                  <div // ** CORRECTED: Use div and ensure onClick is passed **
                                    key={lesson.id}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-md transition-colors", // Keep original classes
                                      lessonCompletionMap[lesson.id] ? "bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30" : "bg-slate-50 dark:bg-slate-800/50",
                                      isEnrolled ? "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" : "cursor-not-allowed opacity-70" // Adjust hover based on enrollment
                                    )}
                                    onClick={isEnrolled ? () => handleNavigateToLesson(module.id, lesson.id) : undefined} // ** CORRECTED: Add onClick **
                                    aria-disabled={!isEnrolled}
                                  >
                                    <div className="flex items-center min-w-0">
                                      {getLessonIcon(lesson)}
                                      <div className="min-w-0">
                                        <h4 className="text-sm font-medium truncate">{lesson.title}</h4>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                          <span className="capitalize">{lesson.type || (lesson.videoUrl ? 'Video' : 'Text')}</span>
                                          {lesson.duration && lesson.duration !== "0:00" && (<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.duration}</span>)}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Status indicator */}
                                    {lessonCompletionMap[lesson.id] ? (
                                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50 flex-shrink-0"> Completed </Badge>
                                    ) : (
                                        // ** CORRECTED: Use original Start button, ensure it's only visually present if clickable **
                                        isEnrolled && <Button variant="ghost" size="sm" className="flex-shrink-0" tabIndex={-1}> Start </Button> // tabIndex=-1 as div handles click
                                    )}
                                  </div>
                               ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* End Course Content Tab */}

              {/* Overview Tab (Keep original) */}
              <TabsContent value="overview">
                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>What You'll Learn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul>{courseSummaries}</ul>
                    </CardContent>
                  </Card>
                  {/* <Card><CardHeader><CardTitle>Prerequisites</CardTitle></CardHeader><CardContent><ul className="space-y-2">{course.prerequisites?.map((prerequisite: string, index: number) => (<li key={index} className="flex items-start gap-2"><div className="h-5 w-5 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mt-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg></div><span className="text-sm">{prerequisite}</span></li>))}</ul></CardContent></Card> */}
                  <Card>
                    <CardHeader>
                      <CardTitle>About the Instructor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={course.instructor?.avatar}
                            alt={course.instructor?.name}
                          />
                          <AvatarFallback>
                            {course.instructor?.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">
                            {course.instructor?.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {course.instructor?.title}
                          </p>
                          <p className="text-sm mt-2">
                            {course.instructor?.bio}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              {/* End Overview Tab */}

              {/* ** MODIFICATION START: Reviews Tab Implementation ** */}
              <TabsContent value="reviews">
                <Card>
                    {/* Use fetched rating/count */}
                    <CardHeader>
                        <CardTitle>Student Reviews</CardTitle>
                         {/* Keep original CardDescription structure, use fetched data */}
                        <CardDescription className="flex items-center gap-1 pt-1">
                           <StarRatingDisplay rating={displayRating} size="h-4 w-4" />
                           <span className="ml-1 font-medium">{displayRating.toFixed(1)}</span>
                           <span className="text-slate-400"> ({displayReviewCount.toLocaleString()} reviews)</span> {/* Use original format */}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Loading state */}
                        {isLoadingReviews && (
                          <div className="space-y-4 pt-2">
                             {[...Array(3)].map((_, i) => (
                               <div key={i} className="flex space-x-4 animate-pulse">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <div className="space-y-2 flex-1">
                                     <Skeleton className="h-4 w-1/4" />
                                     <Skeleton className="h-3 w-1/5" />
                                     <Skeleton className="h-4 w-full" />
                                  </div>
                               </div>
                             ))}
                          </div>
                        )}

                        {/* Error state */}
                        {!isLoadingReviews && reviewsError && (
                            <p className="text-red-600 text-center py-4">Could not load reviews.</p>
                        )}

                        {/* No reviews state */}
                        {!isLoadingReviews && !reviewsError && reviewsData.length === 0 && (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                                <MessageCircle className="mx-auto h-10 w-10 mb-2"/>
                                <p>No reviews yet.</p>
                            </div>
                        )}

                        {/* Display Reviews */}
                        {!isLoadingReviews && !reviewsError && reviewsData.length > 0 && (
                            <div className="space-y-6 divide-y dark:divide-slate-700 -mt-2">
                                {reviewsData.map((review) => (review?.id != null &&
                                    <div key={review.id} className="flex items-start gap-4 pt-6 first:pt-0">
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={review.user?.profilePicture || undefined} alt={review.user?.name ?? 'User'} />
                                            <AvatarFallback>{review.user?.name?.split(' ').map(n => n?.[0]).join('').toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2">
                                                <h4 className="text-sm font-medium">{review.user?.name ?? 'Anonymous'}</h4>
                                                <time dateTime={review.createdAt} className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{new Date(review.createdAt).toLocaleDateString()}</time>
                                            </div>
                                            <div className="mb-2">
                                                <StarRatingDisplay rating={review.stars ?? 0} size="h-4 w-4" />
                                            </div>
                                            {review.comment ? (
                                               <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{review.comment}</p>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">No comment provided.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>
               {/* ** MODIFICATION END: Reviews Tab Implementation ** */}

            </Tabs>
          </div>
          {/* End Left Column */}


          {/* Right Sidebar (Keep original structure and content) */}
          <div>
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Progress Card (Keep original) */}
              {isEnrolled && course.progress >= 0 && ( // Use original check >= 0
                <Card>
                  <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>{completedLessonsCount} of {totalLessons} completed</span><span>{course.progress ?? 0}%</span></div>
                      <Progress value={course.progress ?? 0} />
                      {/* ** CORRECTED: Ensure onClick is passed ** */}
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">You're making great progress! Continue where you left off:</p>

                      <Button onClick={handleContinueProgress} className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 w-full mt-4 text-white"><Play className="mr-2 h-4 w-4" />Continue Course</Button> {/* Use mt-4 if original */}
                       {/* Removed extra <p> tag from original that was here */}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Course Info Card (Keep original) */}
              <Card>
                  <CardHeader><CardTitle>Course Information</CardTitle></CardHeader>
                   <CardContent>
                      <div className="space-y-4">
                        {/* ... Keep all original divs inside CardContent ... */}
                        <div className="flex items-center justify-between"><div className="flex items-center"><Calendar className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Last Updated</span></div><span className="text-sm font-medium">{course.lastUpdated}</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><BookOpen className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Content</span></div><span className="text-sm font-medium">{totalLessons} lessons</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><Clock className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Duration</span></div><span className="text-sm font-medium">{course.duration}</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><Flag className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Level</span></div><span className="text-sm font-medium">{course.level}</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><Users className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Students</span></div><span className="text-sm font-medium">{enrollmentCount.toLocaleString()}</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><MessageSquare className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Language</span></div><span className="text-sm font-medium">English</span></div>
                        <div className="flex items-center justify-between"><div className="flex items-center"><Award className="h-4 w-4 text-slate-400 mr-2" /><span className="text-sm">Certificate</span></div><span className="text-sm font-medium">Upon Completion</span></div>
                      </div>
                  </CardContent>
                  {/* Footer Button (Keep original logic and classes) */}
                  <CardFooter>
                     {isEnrolled ? (
                         // ** CORRECTED: Ensure onClick is passed **
                         <Button onClick={handleContinueProgress} className="w-full bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 text-white">Continue Learning</Button>
                     ) : (
                        // ** CORRECTED: Ensure onClick is passed **
                         <Button
                             onClick={handleStartCourse}
                             className="w-full bg-primary dark:bg-blue-600 dark:hover:bg-blue-700 text-white" // Use original classes
                             disabled={enrollMutation.isPending}
                         >
                             {enrollMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Play className="mr-2 h-4 w-4" />)}
                             {enrollMutation.isPending ? 'Enrolling...' : 'Start Learning'}
                         </Button>
                     )}
                 </CardFooter>
              </Card>

              {/* Share Card (Keep original) */}
              <Card>
                  <CardHeader><CardTitle>Share this Course</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex justify-between"> {/* Keep original justify-between */}
                        <Button variant="outline" size="icon" onClick={() => { if(typeof window !== 'undefined' && navigator.clipboard) { navigator.clipboard.writeText(window.location.href); toast({ title: "Copied to clipboard" }); } }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                             <span className="sr-only">Copy link</span>
                        </Button>
                    </div>
                  </CardContent>
              </Card>
            </div>
          </div>
          {/* End Right Sidebar */}

        </div> {/* End Grid */}
      </div> {/* End Main Content Area */}
    </MainLayout>
  ); // End Component Return
}