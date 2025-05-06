import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
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
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


export default function Dashboard() {
  const { user } = useAuth();
  const currentDate = format(new Date(), "MMMM d, yyyy");
  const [, navigate] = useLocation();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
  }, []);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
  }, []);

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
  const recommendedCourses = [];

  const completedCourses = enrollments?.filter((e: any) => e.progress === 100) || [];
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

  return (
    <MainLayout>
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
          {/* 75% width container */}
          <div className="lg:w-2/4 w-full">
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
                                  {enrollment.course?.title ?? 'Course Title Missing'}
                                </h3>

                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Instructor:{' '}
                                  <span className="font-medium">
                                    {getInstructorName(enrollment.course?.instructor)}
                                  </span>
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400 pt-1">
                                  Completed on:{' '}
                                  {enrollment.completedAt
                                    ? new Date(enrollment.completedAt).toLocaleDateString()
                                    : 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/course-content?id=${enrollment.courseId}`)}
                              >
                                View
                              </Button>
                              {/* <Button
                                size="sm"
                                className="bg-primary dark:bg-blue-600 dark:hover:bg-blue-700"
                                onClick={() => handleOpenReviewModal(enrollment.course)}
                                disabled={!enrollment.course}
                              >
                                Review
                              </Button> */}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6">
                      <div className="text-sm">
                        <a
                          href="#"
                          onClick={() => navigate('/my-courses?tab=completed')}
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

          {/* 25% width container */}
          <div className="lg:w-2/4 w-full">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Mock data for recommended courses - would be fetched from API in real application */}
          <CourseCard
            id={101}
            title="TypeScript Essentials"
            description="Learn type safety and advanced TypeScript features."
            thumbnailUrl="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
            rating={4.9}
            isInProgress={false}
          />

          <CourseCard
            id={102}
            title="Node.js Microservices"
            description="Build scalable backend services with Node.js."
            thumbnailUrl="https://images.unsplash.com/photo-1556155092-490a1ba16284?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
            rating={4.7}
            isInProgress={false}
          />

          <CourseCard
            id={103}
            title="Machine Learning Basics"
            description="Introduction to ML algorithms and applications."
            thumbnailUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
            rating={4.8}
            isInProgress={false}
          />

          <CourseCard
            id={104}
            title="AWS Cloud Fundamentals"
            description="Core AWS services and cloud architecture basics."
            thumbnailUrl="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80"
            rating={4.6}
            isInProgress={false}
          />
        </div>
      </div>
    </MainLayout>
  );
}
