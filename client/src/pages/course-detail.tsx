import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Play, Clock, Users, BookOpen, Star, Flag, Award, ArrowLeft, MessageSquare, Calendar, PlayCircle, FileText, ClipboardCheck } from "lucide-react";

export default function CourseDetail() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // In a real implementation, we would get the course ID from the URL
  // and fetch the course data from the API
  const courseId = new URLSearchParams(location.split("?")[1]).get("id") || "1";
  
  // Mock data for demonstration
  const course = {
    id: courseId,
    title: "JavaScript Fundamentals",
    description: "Learn the core concepts of JavaScript programming. This comprehensive course covers everything from basic syntax to advanced concepts like closures, promises, and async/await.",
    instructor: {
      name: "John Doe",
      avatar: "https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff",
      title: "Senior JavaScript Developer",
      bio: "John has been teaching JavaScript for over 8 years and has worked with companies like Google and Microsoft.",
    },
    rating: 4.8,
    reviews: 124,
    enrolled: 1250,
    lastUpdated: "September 15, 2023",
    duration: "8 hours",
    level: "Beginner to Intermediate",
    progress: 35,
    modules: [
      {
        id: 1,
        title: "Introduction to JavaScript",
        description: "Get familiar with JavaScript basics and setup your development environment.",
        lessons: [
          { id: 1, title: "What is JavaScript?", duration: "10:25", type: "video", completed: true },
          { id: 2, title: "Setting Up Your Environment", duration: "15:30", type: "video", completed: true },
          { id: 3, title: "Your First JavaScript Program", duration: "12:15", type: "video", completed: false },
        ],
      },
      {
        id: 2,
        title: "JavaScript Basics",
        description: "Learn about variables, data types, operators, and control flow.",
        lessons: [
          { id: 4, title: "Variables and Data Types", duration: "18:45", type: "video", completed: false },
          { id: 5, title: "Operators", duration: "14:20", type: "video", completed: false },
          { id: 6, title: "Control Flow", duration: "20:10", type: "video", completed: false },
          { id: 7, title: "Module Quiz", type: "quiz", questions: 10, completed: false },
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
      {
        id: 4,
        title: "DOM Manipulation",
        description: "Learn how to interact with HTML using JavaScript.",
        lessons: [
          { id: 12, title: "Introduction to the DOM", duration: "15:20", type: "video", completed: false },
          { id: 13, title: "Selecting and Modifying Elements", duration: "23:45", type: "video", completed: false },
          { id: 14, title: "Events and Event Handlers", duration: "19:15", type: "video", completed: false },
          { id: 15, title: "DOM Project", type: "project", completed: false },
        ],
      },
      {
        id: 5,
        title: "Asynchronous JavaScript",
        description: "Master callbacks, promises, and async/await.",
        lessons: [
          { id: 16, title: "Introduction to Asynchronous JS", duration: "14:30", type: "video", completed: false },
          { id: 17, title: "Callbacks and Callback Hell", duration: "18:20", type: "video", completed: false },
          { id: 18, title: "Promises", duration: "21:15", type: "video", completed: false },
          { id: 19, title: "Async/Await", duration: "24:45", type: "video", completed: false },
          { id: 20, title: "Final Assessment", type: "quiz", questions: 25, completed: false },
        ],
      },
    ],
    prerequisites: [
      "Basic HTML and CSS knowledge",
      "Familiarity with web browsers and developer tools",
      "No prior JavaScript experience required",
    ],
    objectives: [
      "Understand core JavaScript concepts and syntax",
      "Create interactive web pages using JavaScript",
      "Implement asynchronous programming techniques",
      "Build small JavaScript applications from scratch",
    ],
  };
  
  // Calculate course statistics
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessons = course.modules.reduce((sum, module) => 
    sum + module.lessons.filter(lesson => lesson.completed).length, 0);
  
  const handleStartCourse = () => {
    // In a real implementation, we would navigate to the first lesson
    // or the next uncompleted lesson
    setLocation(`/course-content?id=${course.id}&moduleId=1&lessonId=1`);
  };
  
  const handleContinueProgress = () => {
    // Find the next uncompleted lesson
    // For demonstration, we'll just go to lesson 3 (first uncompleted)
    setLocation(`/course-content?id=${course.id}&moduleId=1&lessonId=3`);
  };
  
  const handleNavigateToLesson = (moduleId: number, lessonId: number) => {
    setLocation(`/course-content?id=${course.id}&moduleId=${moduleId}&lessonId=${lessonId}`);
  };
  
  return (
    <MainLayout>
      {/* Course Header */}
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/course-catalog">
              <a className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Courses
              </a>
            </Link>
          </div>
          <div className="md:flex md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">{course.title}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
                {course.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>{course.enrolled.toLocaleString()} enrolled</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">{course.rating}</span>
                  <span className="text-slate-400">({course.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flag className="h-4 w-4 text-slate-400" />
                  <span>{course.level}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3 md:mt-0">
              {course.progress > 0 ? (
                <Button onClick={handleContinueProgress}>
                  Continue Learning
                </Button>
              ) : (
                <Button onClick={handleStartCourse}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Course
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="content">
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="content" className="flex-1">Course Content</TabsTrigger>
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                    <CardDescription>
                      {course.modules.length} modules • {totalLessons} lessons • {course.duration} total length
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {course.modules.map((module) => (
                        <div key={module.id} className="py-4 px-6">
                          <div className="mb-2">
                            <h3 className="text-lg font-medium">{module.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
                          </div>
                          <div className="space-y-2 mt-3">
                            {module.lessons.map((lesson) => (
                              <div 
                                key={lesson.id} 
                                className={`flex items-center justify-between p-3 rounded-md ${
                                  lesson.completed 
                                    ? "bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30" 
                                    : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                }`}
                                onClick={() => handleNavigateToLesson(module.id, lesson.id)}
                              >
                                <div className="flex items-center">
                                  {lesson.type === "video" ? (
                                    <PlayCircle className={`mr-3 h-5 w-5 ${lesson.completed ? "text-green-500" : "text-slate-400"}`} />
                                  ) : lesson.type === "quiz" ? (
                                    <ClipboardCheck className={`mr-3 h-5 w-5 ${lesson.completed ? "text-green-500" : "text-slate-400"}`} />
                                  ) : lesson.type === "assignment" ? (
                                    <FileText className={`mr-3 h-5 w-5 ${lesson.completed ? "text-green-500" : "text-slate-400"}`} />
                                  ) : (
                                    <FileText className={`mr-3 h-5 w-5 ${lesson.completed ? "text-green-500" : "text-slate-400"}`} />
                                  )}
                                  <div>
                                    <h4 className="text-sm font-medium">{lesson.title}</h4>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                      {lesson.type === "video" && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {lesson.duration}
                                        </span>
                                      )}
                                      {lesson.type === "quiz" && <span>{lesson.questions} questions</span>}
                                      <span className="capitalize">{lesson.type}</span>
                                    </div>
                                  </div>
                                </div>
                                {lesson.completed ? (
                                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50">
                                    Completed
                                  </Badge>
                                ) : (
                                  <Button variant="ghost" size="sm">
                                    Start
                                  </Button>
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
              
              <TabsContent value="overview">
                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>What You'll Learn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {course.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="h-5 w-5 flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                            <span className="text-sm">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Prerequisites</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {course.prerequisites.map((prerequisite, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="h-5 w-5 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18"></path><path d="M6 6l12 12"></path>
                              </svg>
                            </div>
                            <span className="text-sm">{prerequisite}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>About the Instructor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={course.instructor.avatar} alt={course.instructor.name} />
                          <AvatarFallback>{course.instructor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{course.instructor.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{course.instructor.title}</p>
                          <p className="text-sm mt-2">{course.instructor.bio}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Reviews</CardTitle>
                    <CardDescription>
                      {course.reviews} reviews • {course.rating} average rating
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                      <div className="flex-1">
                        <div className="text-center mb-4">
                          <div className="text-5xl font-bold">{course.rating}</div>
                          <div className="flex justify-center mt-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-5 w-5 ${i < Math.floor(course.rating) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" />
                            ))}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {course.reviews} ratings
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const percentage = rating === 5 ? 68 : 
                                              rating === 4 ? 20 : 
                                              rating === 3 ? 8 : 
                                              rating === 2 ? 3 : 1;
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <div className="flex items-center gap-1 w-16">
                                  <span>{rating}</span>
                                  <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                  <div 
                                    className="bg-amber-400 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="w-12 text-sm text-right">{percentage}%</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="mb-6" />
                    
                    <div className="space-y-6">
                      {/* Sample reviews */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="https://ui-avatars.com/api/?name=Sarah+Johnson&background=FFA500&color=fff" alt="Sarah Johnson" />
                            <AvatarFallback>SJ</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Sarah Johnson</h4>
                              <span className="text-sm text-slate-500 dark:text-slate-400">2 weeks ago</span>
                            </div>
                            <div className="flex items-center mt-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" />
                              ))}
                            </div>
                            <p className="text-sm">
                              This course was incredible! The instructor explains complex concepts in simple terms, and the exercises helped me reinforce what I learned.
                            </p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="https://ui-avatars.com/api/?name=Michael+Chen&background=4169E1&color=fff" alt="Michael Chen" />
                            <AvatarFallback>MC</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Michael Chen</h4>
                              <span className="text-sm text-slate-500 dark:text-slate-400">1 month ago</span>
                            </div>
                            <div className="flex items-center mt-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < 4 ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" />
                              ))}
                            </div>
                            <p className="text-sm">
                              Great course for beginners. I had some prior experience with JavaScript, but this course helped fill in the gaps in my knowledge. The section on async/await was particularly helpful.
                            </p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src="https://ui-avatars.com/api/?name=Emily+Rodriguez&background=32CD32&color=fff" alt="Emily Rodriguez" />
                            <AvatarFallback>ER</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Emily Rodriguez</h4>
                              <span className="text-sm text-slate-500 dark:text-slate-400">2 months ago</span>
                            </div>
                            <div className="flex items-center mt-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} fill="currentColor" />
                              ))}
                            </div>
                            <p className="text-sm">
                              I've tried several JavaScript courses before, but this one stands out. The progression from basic to advanced topics is logical, and the projects are engaging and practical.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center mt-4">
                        <Button variant="outline">Load More Reviews</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <div className="lg:sticky lg:top-6 space-y-6">
              {course.progress > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{completedLessons} of {totalLessons} completed</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                        You're making great progress! Continue where you left off:
                      </p>
                      <Button onClick={handleContinueProgress} className="w-full mt-2">
                        <Play className="mr-2 h-4 w-4" />
                        Continue Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Course Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Last Updated</span>
                      </div>
                      <span className="text-sm font-medium">{course.lastUpdated}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Content</span>
                      </div>
                      <span className="text-sm font-medium">{totalLessons} lessons</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <span className="text-sm font-medium">{course.duration}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Level</span>
                      </div>
                      <span className="text-sm font-medium">{course.level}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Students</span>
                      </div>
                      <span className="text-sm font-medium">{course.enrolled.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Language</span>
                      </div>
                      <span className="text-sm font-medium">English</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Award className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm">Certificate</span>
                      </div>
                      <span className="text-sm font-medium">Upon Completion</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {course.progress === 0 && (
                    <Button onClick={handleStartCourse} className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Start Learning
                    </Button>
                  )}
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Share this Course</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <Button variant="outline" size="icon" onClick={() => {
                      toast({
                        title: "Copied to clipboard",
                        description: "The course link has been copied to your clipboard.",
                      });
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5 0-.28-.03-.56-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                        <rect x="2" y="9" width="4" height="12"></rect>
                        <circle cx="4" cy="4" r="2"></circle>
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}