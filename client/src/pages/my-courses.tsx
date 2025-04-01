import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ArrowRight, Clock, BookOpen, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function MyCourses() {
  const { user } = useAuth();
  
  // Mock data for demonstration
  const enrolledCourses = [
    {
      id: 1,
      title: "JavaScript Fundamentals",
      description: "Learn the core concepts of JavaScript programming",
      progress: 75,
      lastAccessed: "2 days ago",
      instructor: "John Doe",
      duration: "8 hours",
      modules: 12,
    },
    {
      id: 2,
      title: "React for Beginners",
      description: "Build modern user interfaces with React",
      progress: 40,
      lastAccessed: "1 week ago",
      instructor: "Jane Smith",
      duration: "10 hours",
      modules: 8,
    },
    {
      id: 3,
      title: "Advanced CSS Techniques",
      description: "Master CSS layouts, animations, and responsive design",
      progress: 20,
      lastAccessed: "3 days ago",
      instructor: "Mark Johnson",
      duration: "6 hours",
      modules: 10,
    },
    {
      id: 4,
      title: "Introduction to Data Science",
      description: "Explore data analysis and machine learning concepts",
      progress: 5,
      lastAccessed: "Just started",
      instructor: "Sarah Williams",
      duration: "14 hours",
      modules: 15,
    },
  ];
  
  const completedCourses = [
    {
      id: 5,
      title: "HTML & CSS Basics",
      description: "Learn the foundations of web development",
      completedDate: "Aug 12, 2023",
      instructor: "Robert Brown",
      duration: "5 hours",
      modules: 8,
    },
    {
      id: 6,
      title: "Introduction to TypeScript",
      description: "Add type safety to your JavaScript applications",
      completedDate: "Jul 24, 2023",
      instructor: "Emily Davis",
      duration: "7 hours",
      modules: 9,
    },
  ];
  
  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">My Courses</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your enrolled and completed courses
          </p>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search your courses..." className="pl-8" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              Sort By
            </Button>
            <select className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
              <option value="all">All Categories</option>
              <option value="programming">Programming</option>
              <option value="design">Design</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
        
        <Tabs defaultValue="inProgress">
          <TabsList className="mb-6">
            <TabsTrigger value="inProgress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inProgress">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrolledCourses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span>{course.modules} modules</span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Last accessed: {course.lastAccessed}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <div className="text-sm">
                      Instructor: <span className="font-medium">{course.instructor}</span>
                    </div>
                    <Button size="sm">
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedCourses.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription>{course.description}</CardDescription>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-1 rounded-full">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <span>{course.modules} modules</span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Completed on: {course.completedDate}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <div className="text-sm">
                      Instructor: <span className="font-medium">{course.instructor}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Review Course
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}