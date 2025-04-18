import { useState, useEffect } from "react";
import ChatbotWidget from "@/components/ChatbotWidget";

import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { ModuleAssessment } from "@/components/dashboard/module-assessment";
import { CourseLessonResources } from "@/components/dashboard/course-lesson-resources";
import { ModuleAssessmentStatus } from "@/components/dashboard/module-assessment-status";

function TakeAssessmentTrigger({ moduleId, onClick }: { moduleId: number, onClick: () => void }) {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/modules/${moduleId}/questions`)
      .then(res => res.ok ? res.json() : [])
      .then((questions: any[]) => {
        setQuestionCount(Array.isArray(questions) ? questions.length : 0);
        setLoading(false);
      })
      .catch(() => {
        setQuestionCount(0);
        setLoading(false);
      });
  }, [moduleId]);

  if (loading || questionCount === null) return null;
  if (questionCount < 10) return null;

  return (
    <div className="p-2 flex justify-center">
      <Button size="sm" variant="default" onClick={onClick}>
        Take Assessment
      </Button>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation, Link, useSearch } from "wouter";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, MessageSquare, Clock, Download, BookOpen, HelpCircle, PlayCircle, ClipboardCheck, FileText, Loader2, PanelLeftClose, PanelRightOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Define types based on Prisma schema (adjust if needed)
type Instructor = { id: number; firstName?: string | null; lastName?: string | null; profilePicture?: string | null; };
type Lesson = { id: number; title: string; content?: string | null; videoUrl?: string | null; duration?: number | null; position: number; type?: string; completed?: boolean; };
type Module = { id: number; title: string; description?: string | null; lessons: Lesson[]; position: number; };
type Course = {
  id: number;
  title: string;
  description?: string | null;
  instructor?: Instructor | null;
  modules: Module[];
  duration?: number | null;
  difficulty?: string | null;
  updatedAt: string;
};
type LessonProgress = { lessonId: number; status: string; };

import { useQuery } from "@tanstack/react-query";

// AssessmentLessonWrapper: Handles display of assessment result and retake logic
function AssessmentLessonWrapper({ moduleId, lessonId, userId }: { moduleId: number; lessonId: number; userId?: number }) {
  const [latestAttempt, setLatestAttempt] = useState<{ id: number; score: number; passed: boolean; status: string; completedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [retake, setRetake] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/modules/${moduleId}/assessment-attempts/me`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setLatestAttempt(data);
        setLoading(false);
      })
      .catch(() => {
        setLatestAttempt(null);
        setLoading(false);
      });
  }, [moduleId, userId, retake]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
        <span>Loading assessment status...</span>
      </div>
    );
  }

  if (latestAttempt && latestAttempt.passed && !retake) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Assessment Passed</div>
        <div className="text-lg mb-2">Score: <span className="font-semibold">{latestAttempt.score}%</span></div>
        <div className="mb-4 text-slate-500 dark:text-slate-400">Completed at: {latestAttempt.completedAt ? new Date(latestAttempt.completedAt).toLocaleString() : "N/A"}</div>
        <Button variant="default" onClick={() => setRetake(true)}>
          Retake Test
        </Button>
      </div>
    );
  }

  // If not passed or retake requested, show the assessment UI
  return (
    <ModuleAssessment
      moduleId={moduleId}
      onPassed={() => {
        setRetake(false);
        // Refetch latest attempt after passing
        setTimeout(() => {
          setLoading(true);
          fetch(`/api/modules/${moduleId}/assessment-attempts/me`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              setLatestAttempt(data);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }, 500);
      }}
    />
  );
}

export default function CourseContent() {
  const [activeAssessmentModuleId, setActiveAssessmentModuleId] = useState<number | null>(null);
  const [assessmentCompletionMap, setAssessmentCompletionMap] = useState<Record<number, boolean>>({});
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const fetchComments = async (lessonId: number) => {
    try {
      const res = await fetch(`/api/comments?lessonId=${lessonId}`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePostComment = async () => {
    if (!currentLesson?.id || !newComment.trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          comment: newComment.trim(),
          parentId: null,
        }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      fetchComments(currentLesson.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePostReply = async (parentId: number) => {
    if (!currentLesson?.id || !replyText.trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          comment: replyText.trim(),
          parentId,
        }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      setReplyText("");
      setReplyingTo(null);
      fetchComments(currentLesson.id);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleReply = (commentId: number) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText("");
  };

  const { user } = useAuth();
  const { data: certificates = [] } = useQuery<any[]>({
    queryKey: ["/api/certificates-user"],
    enabled: !!user,
  });
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<number, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Get IDs from URL query parameters using useSearch
  const queryParams = new URLSearchParams(search);
  const courseId = queryParams.get("id");
  const currentModuleIdParam = queryParams.get("moduleId");
  const currentLessonIdParam = queryParams.get("lessonId");

  // Fetch course data including modules and lessons
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        toast({ title: "Error", description: "Course ID missing.", variant: "destructive" });
        setLocation('/course-catalog');
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Course not found");
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Course = await response.json();

        data.modules?.sort((a, b) => a.position - b.position);
        data.modules?.forEach(m => m.lessons?.sort((a, b) => a.position - b.position));

        setCourse(data);

        const initialModuleId = currentModuleIdParam ? parseInt(currentModuleIdParam, 10) : data.modules?.[0]?.id;
        const initialLessonId = currentLessonIdParam ? parseInt(currentLessonIdParam, 10) : data.modules?.[0]?.lessons?.[0]?.id;

        const initialModule = data.modules?.find(m => m.id === initialModuleId);
        const moduleToSearchIn = initialModule || data.modules?.[0];
        const initialLesson = moduleToSearchIn?.lessons?.find(l => l.id === initialLessonId);

        setCurrentModule(initialModule || data.modules?.[0] || null);
        setCurrentLesson(initialLesson || moduleToSearchIn?.lessons?.[0] || null);

        if (user?.id) {
          try {
            const progressResponse = await fetch(`/api/courses/${courseId}/progress`);
            if (progressResponse.ok) {
              const progressData: LessonProgress[] = await progressResponse.json();
              const progressMap = progressData.reduce((acc: Record<number, boolean>, p) => {
                acc[p.lessonId] = p.status === 'completed';
                return acc;
              }, {});
              setLessonProgressMap(progressMap);
            } else {
              console.error("Failed to fetch lesson progress:", progressResponse.statusText);
            }
          } catch (progressError) {
            console.error("Error fetching lesson progress:", progressError);
          }
        }

      } catch (error) {
        console.error("Failed to fetch course data:", error);
        toast({ title: "Error", description: `Could not load course: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        setCourse(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user?.id, setLocation, toast]);

  // Change lesson without re-fetching course
  useEffect(() => {
    if (!course) return;
    const newModuleId = parseInt(queryParams.get("moduleId") || "0", 10);
    const newLessonId = parseInt(queryParams.get("lessonId") || "0", 10);

    const targetModule = course.modules?.find(m => m.id === newModuleId);
    const finalModule = targetModule || course.modules?.[0];

    const targetLesson = finalModule?.lessons?.find(l => l.id === newLessonId);
    const finalLesson = targetLesson || finalModule?.lessons?.[0];

    if (finalModule && finalLesson) {
      setCurrentModule(finalModule);
      setCurrentLesson(finalLesson);
    }
  }, [search, course]);

  // Fetch comments when currentLesson changes
  useEffect(() => {
    if (currentLesson?.id) {
      fetchComments(currentLesson.id);
    }
  }, [currentLesson?.id]);


  // Calculate navigation links
  const allLessons = (
    course?.modules.flatMap(m =>
      [...m.lessons]
        .slice()
        .sort((a, b) => {
          if (a.position === -1 && b.position !== -1) return 1;
          if (a.position !== -1 && b.position === -1) return -1;
          return (a.position ?? 0) - (b.position ?? 0);
        })
        .map(l => ({ ...l, moduleId: m.id }))
    ) || []
  );
  const filteredLessons = allLessons.filter(l => !l.title.toLowerCase().includes("certificate"));
  const currentLessonIndex = allLessons.findIndex(l => l.moduleId === currentModule?.id && l.id === currentLesson?.id);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // Calculate completion statistics excluding dummy lesson
  const totalLessons = filteredLessons.length;
  const completedLessons = filteredLessons.filter(l => lessonProgressMap[l.id]).length;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleMarkComplete = async () => {
    if (!currentLesson || !user) return;

    // Optimistic UI update (optional, uncomment if desired)
    // const previousProgress = { ...lessonProgressMap };
    // setLessonProgressMap(prev => ({ ...prev, [currentLesson.id!]: true }));

    console.log(`Marking lesson ${currentLesson.id} as complete`);
    try {
      const response = await fetch(`/api/lesson-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // userId: user.id, // Backend should get user ID from session/auth
          lessonId: currentLesson.id,
          status: 'completed'
        })
      });

      if (!response.ok) {
        const errorData = await response.text(); // Get more error details
        throw new Error(`Failed to update progress: ${response.status} ${response.statusText} - ${errorData}`);
      }

      // Update local state *after* successful API call (if not doing optimistic update)
      setLessonProgressMap(prev => ({ ...prev, [currentLesson.id]: true }));

      toast({
        title: "Lesson marked as complete",
        description: "Your progress has been saved.",
        variant: "default",
      });

      // Navigate to the next lesson if available
      if (nextLesson) {
        navigateToLesson(nextLesson.moduleId, nextLesson.id);
      }
    } catch (error) {
       // Revert optimistic update if it failed
       // setLessonProgressMap(previousProgress);

       console.error("Failed to mark lesson complete:", error);
       toast({
         title: "Error",
         description: `Could not update progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
         variant: "destructive",
       });
    }
  };

  const navigateToLesson = (moduleId: number | undefined, lessonId: number | undefined) => {
    if (courseId && typeof moduleId === 'number' && typeof lessonId === 'number') {
      setLocation(`/course-content?id=${courseId}&moduleId=${moduleId}&lessonId=${lessonId}`);
    } else {
        console.warn("Navigation cancelled: Missing required IDs", { courseId, moduleId, lessonId });
        toast({
          title: "Navigation Info",
          description: "Cannot navigate, missing information.",
          variant: "default"
        });
    }
  };

  const getLessonIcon = (lesson: Lesson) => {
    const isCertificateLesson = lesson.title.toLowerCase().includes("certificate");
    let iconColor = "text-slate-400";

    if (isCertificateLesson) {
      const hasCert = certificates.some((c) => c.courseId === course?.id);
      iconColor = hasCert ? "text-green-500" : "text-slate-400";
    } else {
      const isCompleted = lesson.id ? lessonProgressMap[lesson.id] ?? false : false;
      iconColor = isCompleted ? "text-green-500" : "text-slate-400";
    }

    const iconClasses = `mr-3 h-5 w-5 ${iconColor}`;

    if (lesson.videoUrl) return <PlayCircle className={iconClasses} />;
    return <FileText className={iconClasses} />;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
           <Skeleton className="h-6 w-48 mb-6" />
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1"> <Skeleton className="h-[600px] w-full rounded-lg" /> </div>
             <div className="lg:col-span-3 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
             </div>
           </div>
        </div>
      </MainLayout>
    );
  }

  if (!course || !currentModule || !currentLesson) {
     return (
      <MainLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Content Not Found</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            { !courseId ? "No course ID provided." : !course ? "The course could not be loaded." : "The selected module or lesson could not be found." }
          </p>
          <Button onClick={() => setLocation('/course-catalog')} className="mt-6">
             <ArrowLeft className="mr-2 h-4 w-4"/> Back to Catalog
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isLessonCompleted = currentLesson.id ? lessonProgressMap[currentLesson.id] ?? false : false;

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4 text-sm flex-shrink-0">
             <Button
               variant="ghost"
               size="icon"
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="lg:hidden"
               aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
             >
               {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
             </Button>
            <Link href={`/course-detail/${courseId}`}>
              <a className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back to Course Details</span>
                <span className="sm:hidden">Back</span>
              </a>
            </Link>
          </div>
           <div className="flex-grow mx-4 min-w-0"></div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <aside className={cn(
            "lg:col-span-1 transition-transform duration-300 ease-in-out lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full absolute lg:static"
          )}>
            <div className="lg:sticky lg:top-[70px] space-y-6 max-h-[calc(100vh-90px)] overflow-y-auto pr-2 custom-scrollbar">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="mt-2">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      {progressPercentage}% Complete
                    </div>
                    <span id="progress-label" className="sr-only">Course completion progress</span>
                    <Progress value={progressPercentage} className="h-2 w-full" aria-labelledby="progress-label" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" defaultValue={currentModule?.id ? [`module-${currentModule.id}`] : []} className="w-full">
                    {course.modules.map((module) => (
                      <AccordionItem key={module.id} value={`module-${module.id}`} className="border-b dark:border-slate-700 last:border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 [&[data-state=open]]:bg-slate-100 dark:[&[data-state=open]]:bg-slate-800 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded-t-md">
                          <div className="text-left flex-grow mr-2">
                            <div className="font-medium leading-snug">{module.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {module.lessons?.length || 0} lessons
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          <div className="divide-y dark:divide-slate-700 border-t dark:border-slate-700">
                            {[...module.lessons]
                              .slice()
                              .sort((a, b) => {
                                if (a.position === -1 && b.position !== -1) return 1;
                                if (a.position !== -1 && b.position === -1) return -1;
                                return (a.position ?? 0) - (b.position ?? 0);
                              })
                              .map((lesson) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => {
                                    setActiveAssessmentModuleId(null);
                                    navigateToLesson(module.id, lesson.id);
                                  }}
                                  disabled={module.id === currentModule?.id && lesson.id === currentLesson?.id}
                                  className={cn(`w-full px-4 py-3 text-left flex items-center gap-2 text-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none`,
                                    module.id === currentModule?.id && lesson.id === currentLesson?.id
                                      ? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 cursor-default"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                                  )}
                                  aria-current={module.id === currentModule?.id && lesson.id === currentLesson?.id ? "page" : undefined}
                                >
                                  {getLessonIcon(lesson)}
                                  <div className="flex-grow min-w-0">
                                    <div className="line-clamp-1">{lesson.title}</div>
                                    {lesson.duration && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        <Clock className="inline h-3 w-3 mr-1" />
                                        {`${Math.floor(lesson.duration / 60)}m ${(lesson.duration % 60).toString()}s`}
                                      </div>
                                    )}
                                  </div>
                                  {lesson.id && lessonProgressMap[lesson.id] && (
                                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-t dark:border-slate-700 gap-2">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {completedLessons} of {totalLessons} completed
                  </div>
                  <Link href={`/course-detail/${courseId}`}>
                    <a className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      Course Overview
                    </a>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </aside>

          <main className={`space-y-6 ${isSidebarOpen ? "lg:col-span-3" : "lg:col-span-4"}`}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-grow">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                      {currentModule.title}
                    </div>
                    <CardTitle className="text-xl lg:text-2xl">{currentLesson.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-2 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToLesson(previousLesson?.moduleId, previousLesson?.id)}
                      disabled={!previousLesson}
                      aria-label="Previous lesson"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToLesson(nextLesson?.moduleId, nextLesson?.id)}
                      disabled={!nextLesson}
                      aria-label="Next lesson"
                    >
                       <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Video Player or Text Content */}
                {currentLesson.type === "assessment" ? (
                  <AssessmentLessonWrapper
                    moduleId={currentModule.id}
                    lessonId={currentLesson.id}
                    userId={user?.id}
                  />
                ) : currentLesson.title.toLowerCase().includes("certificate") ? (
                  <div className="p-6 text-center flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Congratulations!</h2>
                    <p className="text-slate-600 dark:text-slate-300">You have completed the course.</p>
                    <Button
                      variant="default"
                      disabled={
                        progressPercentage < 100 ||
                        certificates.some((c) => c.courseId === course?.id)
                      }
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/certificates/${course?.id}`, {
                            method: "POST",
                          });
                          if (!res.ok) throw new Error("Failed to generate certificate");
                          const data = await res.json();
                          alert(`Certificate generated! ID: ${data.certificateId}`);
                          const { queryClient } = await import("@/lib/queryClient");
                          queryClient.invalidateQueries({ queryKey: ["/api/certificates-user"] });
                        } catch (err) {
                          console.error(err);
                          alert("Failed to generate certificate");
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4 text-yellow-500" />
                      Generate Certificate
                    </Button>
                  </div>
                ) : currentLesson.videoUrl ? (
                  <div className="aspect-video bg-black rounded-t-none">
                    <video
                      key={currentLesson.videoUrl}
                      src={currentLesson.videoUrl}
                      className="w-full h-full"
                      controls
                    ></video>
                  </div>
                ) : currentLesson.content ? (
                   <div className="p-6 prose dark:prose-invert max-w-none prose-sm sm:prose-base">
                     <p>{currentLesson.content}</p>
                   </div>
                ) : (
                   <div className="p-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                       <BookOpen className="h-8 w-8 text-slate-400"/>
                       <span>No content available for this lesson.</span>
                   </div>
                )}

                {(currentLesson.videoUrl || currentLesson.content) && (
                  <div className="p-4 sm:p-6 border-t dark:border-slate-700">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="mb-4 grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
                        {currentLesson.videoUrl && <TabsTrigger value="transcript">Transcript</TabsTrigger>}
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                        <TabsTrigger value="notes">My Notes</TabsTrigger>
                        <TabsTrigger value="discussion">Discussion</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {activeAssessmentModuleId === currentModule.id && (
                      <ModuleAssessment moduleId={currentModule.id} />
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-t dark:border-slate-700 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <HelpCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Need help? <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Contact instructor</a>
                  </span>
                </div>
                <div>
                  {/* Show Checkmark if completed, else show Button */}
                  {currentLesson.type === "assessment" || currentLesson.title.toLowerCase().includes("certificate") ? null : isLessonCompleted ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm p-2 rounded-md bg-green-50 dark:bg-green-900/30">
                        <Check className="h-5 w-5"/>
                        <span>Completed</span>
                      </div>
                  ) : (
                    <Button variant="default" onClick={handleMarkComplete} disabled={isLoading}>
                      <Check className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </main>
        </div>
      </div>
      <ChatbotWidget />
    </MainLayout>
  );
}
