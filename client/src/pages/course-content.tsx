import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, MessageSquare, Clock, Download, BookOpen, HelpCircle, PlayCircle, ClipboardCheck, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function CourseContent() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Parse query parameters from URL
  const queryParams = new URLSearchParams(location.split("?")[1]);
  const courseId = queryParams.get("id") || "1";
  const moduleId = parseInt(queryParams.get("moduleId") || "1");
  const lessonId = parseInt(queryParams.get("lessonId") || "1");
  
  // Mock data for demonstration
  const course = {
    id: courseId,
    title: "JavaScript Fundamentals",
    progress: 35,
    modules: [
      {
        id: 1,
        title: "Introduction to JavaScript",
        description: "Get familiar with JavaScript basics and setup your development environment.",
        lessons: [
          { 
            id: 1, 
            title: "What is JavaScript?", 
            duration: "10:25", 
            type: "video", 
            completed: true,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "In this lesson, we'll explore what JavaScript is and why it's important in web development. JavaScript is a programming language that adds interactivity to your website. It was first introduced in 1995 and has since become one of the core technologies of the web.",
              resources: [
                { name: "JavaScript History PDF", url: "#", type: "pdf" },
                { name: "JavaScript vs Other Languages", url: "#", type: "article" }
              ]
            }
          },
          { 
            id: 2, 
            title: "Setting Up Your Environment", 
            duration: "15:30", 
            type: "video", 
            completed: true,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "In this lesson, we'll set up a development environment for JavaScript programming. We'll be using Visual Studio Code as our code editor and Chrome DevTools for debugging.",
              resources: [
                { name: "VS Code Setup Guide", url: "#", type: "pdf" },
                { name: "Chrome DevTools Cheatsheet", url: "#", type: "pdf" }
              ]
            }
          },
          { 
            id: 3, 
            title: "Your First JavaScript Program", 
            duration: "12:15", 
            type: "video", 
            completed: false,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "Let's write our first JavaScript program! We'll start with a simple 'Hello World' and then explore basic syntax including variables, data types, and operators.",
              resources: [
                { name: "Starter Code", url: "#", type: "code" },
                { name: "JavaScript Syntax Guide", url: "#", type: "article" }
              ]
            }
          },
        ],
      },
      {
        id: 2,
        title: "JavaScript Basics",
        description: "Learn about variables, data types, operators, and control flow.",
        lessons: [
          { 
            id: 4, 
            title: "Variables and Data Types", 
            duration: "18:45", 
            type: "video", 
            completed: false,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "In this lesson, we'll explore JavaScript variables and different data types including strings, numbers, booleans, null, undefined, objects, and arrays.",
              resources: [
                { name: "Data Types Cheatsheet", url: "#", type: "pdf" },
                { name: "Practice Exercises", url: "#", type: "code" }
              ]
            }
          },
          { 
            id: 5, 
            title: "Operators", 
            duration: "14:20", 
            type: "video", 
            completed: false,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "Let's learn about JavaScript operators including arithmetic, assignment, comparison, logical, and string operators.",
              resources: [
                { name: "Operators Reference", url: "#", type: "pdf" }
              ]
            }
          },
          { 
            id: 6, 
            title: "Control Flow", 
            duration: "20:10", 
            type: "video", 
            completed: false,
            content: {
              videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
              transcript: "In this lesson, we'll explore control flow in JavaScript including if-else statements, switch statements, and loops.",
              resources: [
                { name: "Flow Control Examples", url: "#", type: "code" }
              ]
            }
          },
          { 
            id: 7, 
            title: "Module Quiz", 
            type: "quiz", 
            questions: 10, 
            completed: false,
            content: {
              quizId: "js-basics-quiz",
              description: "Test your knowledge of JavaScript basics including variables, data types, operators, and control flow.",
              timeLimit: 15, // minutes
              passingScore: 70, // percent
              totalQuestions: 10
            }
          },
        ],
      },
      {
        id: 3,
        title: "Functions and Objects",
        description: "Understand functions, scope, and objects in JavaScript.",
        lessons: [
          { id: 8, title: "Functions and Parameters", duration: "22:15", type: "video", completed: false },
          { id: 9, title: "Scope and Closures", duration: "25:30", type: "video", completed: false },
          { id: 10, title: "Objects and Methods", duration: "19:45", type: "video", completed: false },
          { id: 11, title: "Functions Assignment", type: "assignment", completed: false },
        ],
      },
    ],
  };
  
  // Find current module and lesson
  const currentModule = course.modules.find(m => m.id === moduleId) || course.modules[0];
  const currentLesson = currentModule.lessons.find(l => l.id === lessonId) || currentModule.lessons[0];
  
  // Calculate navigation
  const allLessons = course.modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
  const currentLessonIndex = allLessons.findIndex(l => l.moduleId === moduleId && l.id === lessonId);
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;
  
  // Calculate completion statistics
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(l => l.completed).length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
  
  // State for quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  const handleMarkComplete = () => {
    // In a real implementation, we would update the completion status on the server
    toast({
      title: "Lesson marked as complete",
      description: "Your progress has been saved.",
      variant: "default",
    });
    
    // Navigate to the next lesson if available
    if (nextLesson) {
      setLocation(`/course-content?id=${courseId}&moduleId=${nextLesson.moduleId}&lessonId=${nextLesson.id}`);
    }
  };
  
  const handleStartQuiz = () => {
    setQuizStarted(true);
  };
  
  const handleSubmitQuiz = () => {
    // In a real implementation, we would submit the quiz answers to the server
    setQuizCompleted(true);
    toast({
      title: "Quiz completed",
      description: "You've passed the quiz with a score of 80%!",
      variant: "default",
    });
  };
  
  const navigateToLesson = (moduleId: number, lessonId: number) => {
    setLocation(`/course-content?id=${courseId}&moduleId=${moduleId}&lessonId=${lessonId}`);
  };
  
  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/course-detail?id=${courseId}`}>
              <a className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Course
              </a>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-6">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{progressPercentage}% Complete</CardDescription>
                  <Progress value={progressPercentage} className="mt-2" />
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" defaultValue={[`module-${moduleId}`]} className="w-full">
                    {course.modules.map((module) => (
                      <AccordionItem key={module.id} value={`module-${module.id}`} className="border-0">
                        <AccordionTrigger className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 [&[data-state=open]]:bg-slate-50 dark:[&[data-state=open]]:bg-slate-800/50">
                          <div className="text-left">
                            <div className="font-medium">{module.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {module.lessons.length} lessons
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          <div className="divide-y">
                            {module.lessons.map((lesson) => (
                              <div 
                                key={lesson.id}
                                onClick={() => navigateToLesson(module.id, lesson.id)}
                                className={`px-4 py-2 flex items-center gap-2 cursor-pointer text-sm ${
                                  module.id === moduleId && lesson.id === lessonId
                                    ? "bg-slate-100 dark:bg-slate-800"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                }`}
                              >
                                {lesson.completed ? (
                                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3 w-3" />
                                  </div>
                                ) : lesson.type === "video" ? (
                                  <PlayCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                ) : lesson.type === "quiz" ? (
                                  <ClipboardCheck className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                )}
                                <div className="flex-grow">
                                  <div className="line-clamp-1">{lesson.title}</div>
                                  {lesson.duration && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {lesson.duration}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
                <CardFooter className="flex justify-between p-4 border-t">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {completedLessons} of {totalLessons} completed
                  </div>
                  <Link href={`/course-detail?id=${courseId}`}>
                    <a className="text-sm font-medium hover:underline">
                      Course Details
                    </a>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {currentModule.title}
                    </div>
                    <CardTitle>{currentLesson.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    {previousLesson && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigateToLesson(previousLesson.moduleId, previousLesson.id)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    )}
                    {nextLesson && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigateToLesson(nextLesson.moduleId, nextLesson.id)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {currentLesson.type === "video" && currentLesson.content && (
                  <div>
                    {/* Video Player */}
                    <div className="aspect-video bg-black">
                      <video 
                        src={currentLesson.content.videoUrl} 
                        className="w-full h-full" 
                        controls
                        poster="https://placehold.co/1280x720/333/white?text=JavaScript+Video"
                      ></video>
                    </div>
                    
                    <div className="p-6">
                      <Tabs defaultValue="transcript">
                        <TabsList className="mb-4">
                          <TabsTrigger value="transcript">Transcript</TabsTrigger>
                          <TabsTrigger value="resources">Resources</TabsTrigger>
                          <TabsTrigger value="notes">My Notes</TabsTrigger>
                          <TabsTrigger value="discussion">Discussion</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="transcript">
                          <div className="prose dark:prose-invert max-w-none">
                            <p>{currentLesson.content.transcript}</p>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="resources">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Lesson Resources</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {currentLesson.content.resources.map((resource, index) => (
                                <Card key={index}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {resource.type === "pdf" ? (
                                        <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                                          <FileText className="h-5 w-5" />
                                        </div>
                                      ) : resource.type === "code" ? (
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="16 18 22 12 16 6"></polyline>
                                            <polyline points="8 6 2 12 8 18"></polyline>
                                          </svg>
                                        </div>
                                      ) : (
                                        <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                          <BookOpen className="h-5 w-5" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-medium">{resource.name}</div>
                                        <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
                                          {resource.type}
                                        </div>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="notes">
                          <div className="space-y-4">
                            <div className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                              <textarea
                                className="w-full h-36 bg-transparent resize-none focus:outline-none text-sm"
                                placeholder="Take notes on this lesson here..."
                              ></textarea>
                            </div>
                            <Button className="w-full sm:w-auto">Save Notes</Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="discussion">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium">Discussion (8)</h3>
                              <Button size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Ask a Question
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                                  M
                                </div>
                                <div className="flex-1">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <div className="flex justify-between mb-2">
                                      <div className="font-medium">Michael Chen</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">2 days ago</div>
                                    </div>
                                    <p className="text-sm">Is there a way to use arrow functions for this example?</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 ml-4">
                                    <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                      Reply
                                    </button>
                                    <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                      Like (3)
                                    </button>
                                  </div>
                                  
                                  <div className="ml-6 mt-3">
                                    <div className="flex gap-4 mt-4">
                                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                                        J
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                          <div className="flex justify-between mb-1">
                                            <div className="font-medium text-sm">John Doe (Instructor)</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">1 day ago</div>
                                          </div>
                                          <p className="text-sm">Yes, absolutely! Instead of using function() {'{'+'...'+'}'}-, you can use the arrow syntax: () =&gt; {'{'+'...'+'}'}. I will show a specific example in the next lesson.</p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 ml-4">
                                          <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                            Reply
                                          </button>
                                          <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                            Like (5)
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                                  S
                                </div>
                                <div className="flex-1">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <div className="flex justify-between mb-2">
                                      <div className="font-medium">Sarah Johnson</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">5 hours ago</div>
                                    </div>
                                    <p className="text-sm">Great explanation! The examples really helped clarify the concept.</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2 ml-4">
                                    <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                      Reply
                                    </button>
                                    <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                      Like (1)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button variant="outline" className="w-full">Load More Comments</Button>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}
                
                {currentLesson.type === "quiz" && currentLesson.content && (
                  <div className="p-6">
                    {!quizStarted ? (
                      <div className="max-w-2xl mx-auto text-center py-12">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6">
                          <ClipboardCheck className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{currentLesson.title}</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                          {currentLesson.content.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold">{currentLesson.content.totalQuestions}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Questions</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold">{currentLesson.content.timeLimit} min</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Time Limit</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold">{currentLesson.content.passingScore}%</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Passing Score</div>
                          </div>
                        </div>
                        
                        <div className="mb-8">
                          <h3 className="font-medium mb-2">Important Information</h3>
                          <ul className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                            <li>You can attempt this quiz up to 3 times.</li>
                            <li>The timer will start once you begin the quiz.</li>
                            <li>You must answer all questions to complete the quiz.</li>
                            <li>Your highest score will be saved.</li>
                          </ul>
                        </div>
                        
                        <Button onClick={handleStartQuiz}>
                          Start Quiz
                        </Button>
                      </div>
                    ) : quizCompleted ? (
                      <div className="max-w-2xl mx-auto text-center py-12">
                        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Check className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                          You've completed the quiz with a score of 80%.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold">8/10</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Correct Answers</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">80%</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Your Score</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold">11:20</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Time Taken</div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <Button onClick={() => navigateToLesson(nextLesson?.moduleId || 3, nextLesson?.id || 8)} className="w-full">
                            Continue to Next Lesson
                          </Button>
                          <Button variant="outline" className="w-full">
                            Review Quiz Answers
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="sticky top-0 bg-white dark:bg-slate-900 pt-4 pb-6 mb-6 z-10">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-lg font-bold">{currentLesson.title}</h2>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                Question 1 of {currentLesson.content.totalQuestions}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                              <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <span className="text-sm font-medium">13:40 remaining</span>
                            </div>
                          </div>
                          <Progress value={10} className="mt-4" />
                        </div>
                        
                        <div className="max-w-3xl mx-auto">
                          <div className="space-y-10">
                            <div className="space-y-6">
                              <h3 className="text-lg font-medium">Which of the following is NOT a JavaScript data type?</h3>
                              
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <input type="radio" id="q1-a" name="q1" className="h-4 w-4" />
                                  <label htmlFor="q1-a" className="text-sm">String</label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="radio" id="q1-b" name="q1" className="h-4 w-4" />
                                  <label htmlFor="q1-b" className="text-sm">Integer</label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="radio" id="q1-c" name="q1" className="h-4 w-4" />
                                  <label htmlFor="q1-c" className="text-sm">Boolean</label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="radio" id="q1-d" name="q1" className="h-4 w-4" />
                                  <label htmlFor="q1-d" className="text-sm">Undefined</label>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between pt-10 border-t mt-10">
                            <Button variant="outline" disabled>
                              <ChevronLeft className="mr-2 h-4 w-4" />
                              Previous
                            </Button>
                            <Button onClick={handleSubmitQuiz}>
                              Submit Quiz
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Need help? Contact instructor
                  </span>
                </div>
                <div>
                  {currentLesson.type === "video" && currentLesson.completed === false && (
                    <Button variant="default" onClick={handleMarkComplete}>
                      <Check className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}