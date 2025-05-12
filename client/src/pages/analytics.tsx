import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  BarChart,
  PieChart,
  LineChart,
  Users,
  Clock,
  BookOpen,
  Award,
  Download,
  FileText,
  BarChart2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Chart from "react-apexcharts";

export default function Analytics() {
  const { user } = useAuth();
  const role = user?.role || "employee";
  const [users, setUsers] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState([]);
  const [analyticsData, setAnalyticsData] = React.useState<{
    courseData: any[];
    stats: {
      totalUsers: number;
      courseCompletion: number;
      avgEngagement: string;
      certificatesIssued: number;
    };
  }>({
    courseData: [],
    stats: {
      totalUsers: 0,
      courseCompletion: 0,
      avgEngagement: "0.0",
      certificatesIssued: 0,
    },
  });

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/analytics/overview");
        if (!response.ok) throw new Error("Failed to fetch analytics");
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchEntrollments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/all/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
    }
  };

  const fetchEntrollments = async () => {
    try {
      const response = await fetch("/api/enrollments");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setEnrollments(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
    }
  };

  const courseData = analyticsData.courseData;
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Stats cards data
  const statsData = [
    {
      title: "Total Users",
      value: analyticsData.stats.totalUsers.toLocaleString(),
      change: "+12%", // Could be calculated if historical data is available
      positive: true,
      icon: <Users className="h-4 w-4" />,
      description: "Active learners in platform",
    },
    {
      title: "Course Completion",
      value: `${analyticsData.stats.courseCompletion}%`,
      change: "+5%", // Could be calculated if historical data is available
      positive: true,
      icon: <BookOpen className="h-4 w-4" />,
      description: "Average completion rate",
    },
    {
      title: "Avg. Engagement",
      value: `${analyticsData.stats.avgEngagement}h`,
      change: "+0.5h", // Could be calculated if historical data is available
      positive: true,
      icon: <Clock className="h-4 w-4" />,
      description: "Weekly time spent learning",
    },
    {
      title: "Certificates Issued",
      value: analyticsData.stats.certificatesIssued.toString(),
      change: "+24", // Could be calculated if historical data is available
      icon: <Award className="h-4 w-4" />,
      description: "Last 30 days",
    },
  ];

  const options = {
    chart: {
      type: "bar",
      stacked: false,
      toolbar: { show: false },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: courseData?.map((item) => item.name) || [],
      labels: {
        style: {
          colors: isDarkMode ? "#ffffff" : "#000000", // x-axis label color
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? "#ffffff" : "#000000", // y-axis label color
        },
      },
    },
    legend: {
      position: "top",
      labels: {
        colors: isDarkMode ? "#ffffff" : "#000000", // legend label color
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontFamily: "Helvetica, Arial, sans-serif", // Optional: Ensure consistent font family
        fontSize: "12px", // Optional: Set a standard font size
      },
      onDatasetHover: {
        highlightDataSeries: true,
      },
      theme: isDarkMode ? "dark" : "light", // Use the built-in theme for tooltips if the library supports it
    },
    colors: ["#8884d8", "#82ca9d", "#ffc658"],
  };

  const series = [
    {
      name: "Average Score",
      data: courseData?.map((item) => item.avgScore) || [],
    },
    {
      name: "Completion",
      data: courseData?.map((item) => item.completion) || [],
    },
    {
      name: "Enrollment",
      data: courseData?.map((item) => item.enrollment) || [],
    },
  ];

  const getCountMap = (key) =>
    users.reduce((acc, user) => {
      acc[user[key]] = (acc[user[key]] || 0) + 1;
      return acc;
    }, {});

  const statusCount = getCountMap("status"); // e.g. { active: 2 }
  const roleCount = getCountMap("role"); // e.g. { admin: 1, contributor: 1 }

  const getChartConfig = (countMap, colors) => ({
    options: {
      labels: Object.keys(countMap),
      legend: {
        position: "bottom",
        labels: {
          colors: "#64748b",
        },
      },
      colors,
      chart: { type: "donut" },
      dataLabels: {
        style: {
          colors: ["#64748b"],
        },
        formatter: function (val, opts) {
          return opts.w.config.series[opts.seriesIndex]; // actual count
        },
      },
    },
    series: Object.values(countMap),
  });

  const statusChart = getChartConfig(statusCount, ["#22C55E", "#EF4444"]);
  const roleChart = getChartConfig(roleCount, [
    "#3B82F6",
    "#F59E0B",
    "#8B5CF6",
  ]);
  // 1. Bar Chart - Enrollments by Course
  const courseCountMap = enrollments.reduce((acc, e) => {
    const courseName = e.course?.title || "Unknown";
    acc[courseName] = (acc[courseName] || 0) + 1;
    return acc;
  }, {});

  const courseBarData = {
    series: [
      {
        name: "Enrollments",
        data: Object.values(courseCountMap),
      },
    ],
    options: {
      chart: {
        type: "bar",
        background: "transparent",
        toolbar: { show: false },
      },
      xaxis: {
        categories: Object.keys(courseCountMap),
        title: {
          text: "Courses",
          style: {
            color: isDarkMode ? "#ffffff" : "#000000",
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? "#ffffff" : "#000000",
          },
        },
      },
      yaxis: {
        title: {
          text: "Number of Enrollments",
          style: {
            color: isDarkMode ? "#ffffff" : "#000000",
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? "#ffffff" : "#000000",
          },
        },
      },
      tooltip: {
        theme: isDarkMode ? "dark" : "light", // 👈 handles tooltip styling
      },
      legend: {
        labels: {
          colors: isDarkMode ? "#ffffff" : "#000000",
        },
      },
      colors: ["#60a5fa"], // A color like soft blue that works in both themes
    },
  };

  // 2. Donut Chart - Course Status
  const courseStatusCount = enrollments.reduce((acc, e) => {
    const status = e.course?.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusDonutData = {
    series: Object.values(courseStatusCount),
    options: {
      chart: {
        type: "donut",
      },
      labels: Object.keys(courseStatusCount),
      legend: {
        position: "bottom",
        labels: {
          colors: "#64748b",
        },
      },
      dataLabels: {
        formatter: (val, opts) => opts.w.config.series[opts.seriesIndex],
      },
    },
  };

  // 3. Line Chart - Enrollments Over Time
  const enrollmentsByDate = enrollments.reduce((acc, e) => {
    const date = new Date(e.enrolledAt).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const lineChartData = {
    series: [
      {
        name: "Enrollments",
        data: Object.values(enrollmentsByDate),
      },
    ],
    options: {
      chart: {
        type: "line",
        background: "transparent",
      },
      xaxis: {
        categories: Object.keys(enrollmentsByDate),
        title: {
          text: "Date",
          style: {
            fontSize: "14px",
            fontWeight: "bold",
            color: isDarkMode ? "#ffffff" : "#000000", // 👈 X-axis title color
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? "#ffffff" : "#000000", // 👈 X-axis labels
          },
        },
      },
      yaxis: {
        title: {
          text: "Number of Enrollments",
          style: {
            fontSize: "14px",
            fontWeight: "bold",
            color: isDarkMode ? "#ffffff" : "#000000", // 👈 Y-axis title color
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? "#ffffff" : "#000000", // 👈 Y-axis labels
          },
        },
      },
      tooltip: {
        theme: isDarkMode ? "dark" : "light", // 👈 Tooltip theme
      },
      legend: {
        labels: {
          colors: isDarkMode ? "#ffffff" : "#000000", // 👈 Legend labels color
        },
      },
      colors: ["#3b82f6"], // blue-500 (good for both light/dark)
    },
  };

  const getRandomColor = () => {
    const r = Math.floor(120 + Math.random() * 100); // 120–220
    const g = Math.floor(120 + Math.random() * 100); // 120–220
    const b = Math.floor(120 + Math.random() * 100); // 120–220
    return `rgb(${r}, ${g}, ${b})`;
  };

  const maxEnrollment = Math.max(...courseData.map((c) => c.enrollment));
  // Detect dark mode class and update on change
  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Monitor learning metrics and platform performance
            </p>
          </div>
          {/* <div className="mt-4 flex md:mt-0 md:ml-4">
            <select className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm mr-2">
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div> */}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </span>
                  <span className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    {stat.icon}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span
                    className={`text-xs ${
                      stat.positive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {/* {stat.change} */}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            {role === "admin" && <TabsTrigger value="users">Users</TabsTrigger>}
            <TabsTrigger value="assessments">Enrollments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Enrollment</CardTitle>
                      <CardDescription>
                        Tracking monthly enrollment
                      </CardDescription>
                    </div>
                    <AreaChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    {courseData?.map((course, index) => (
                      <div key={index} className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            {course.name}
                          </span>
                          <span className="text-sm text-slate-500">
                            {course.enrollment} enrollment
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (course.enrollment / maxEnrollment) * 100,
                                100
                              )}%`,
                              backgroundColor: getRandomColor(),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Completion Rates</CardTitle>
                      <CardDescription>
                        Course completion trends
                      </CardDescription>
                    </div>
                    <LineChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    {courseData?.map((course, index) => (
                      <div key={index} className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">
                            {course.name}
                          </span>
                          <span className="text-sm text-slate-500">
                            {course.completion}% completed
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${course.completion}%`,
                              backgroundColor: getRandomColor(),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Platform Engagement</CardTitle>
                    <CardDescription>
                      Daily active users and session duration
                    </CardDescription>
                  </div>
                  <AreaChart className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="text-lg font-medium mb-4">
                        Course Performance
                      </h3>
                      {courseData?.map((course, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">
                              {course.name}
                            </span>
                            <span className="text-sm text-slate-500">
                              {course.avgScore}% avg score
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${course.avgScore}%`,
                                backgroundColor: getRandomColor(),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="text-lg font-medium mb-4">
                        User Activity
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Active Users</span>
                          <span className="font-medium">
                            {analyticsData?.stats?.totalUsers || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Avg. Engagement</span>
                          <span className="font-medium">
                            {analyticsData?.stats?.avgEngagement || 0}h/week
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Course Completion Rate</span>
                          <span className="font-medium">
                            {analyticsData?.stats?.courseCompletion || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            {/* Course Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Popular Courses</CardTitle>
                      <CardDescription>By enrollment numbers</CardDescription>
                    </div>
                    <BarChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {courseData.map((course, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{course.name}</p>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (course.enrollment / 150) * 100
                                )}%`,
                                backgroundColor: getRandomColor(),
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {course.enrollment}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Distribution</CardTitle>
                      <CardDescription>By category</CardDescription>
                    </div>
                    <PieChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    {courseData && courseData.length ? (
                      <Chart
                        options={options}
                        series={series}
                        type="bar"
                        height="100%"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <CardDescription>
                  Completion rates and assessment scores
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                          Course Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                          Enrollment
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                          Completion
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                          Avg. Score
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseData.map((course, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-3 text-sm font-medium">
                            {course.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {course.enrollment}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {course.completion}%
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {course.avgScore}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            {/* User Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Status</CardTitle>
                      <CardDescription>
                        Distribution of active vs inactive users
                      </CardDescription>
                    </div>
                    <PieChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    <Chart
                      options={statusChart.options}
                      series={statusChart.series}
                      type="donut"
                      height="100%"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Role */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Roles</CardTitle>
                      <CardDescription>
                        Distribution of user roles
                      </CardDescription>
                    </div>
                    <PieChart className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    <Chart
                      options={roleChart.options}
                      series={roleChart.series}
                      type="donut"
                      height="100%"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assessments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Enrollments by Course - Bar Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Enrollments by Course</CardTitle>
                      <CardDescription>
                        Shows course enrollment count
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    <Chart
                      options={courseBarData.options}
                      series={courseBarData.series}
                      type="bar"
                      height={250}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Course Status Donut Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Status</CardTitle>
                      <CardDescription>
                        Distribution of courses by status
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-64">
                    <Chart
                      options={statusDonutData.options}
                      series={statusDonutData.series}
                      type="donut"
                      height={250}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Enrollments Over Time Line Chart - Full Width */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Enrollments Over Time</CardTitle>
                        <CardDescription>
                          Tracks enrollments per day
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-64">
                      <Chart
                        options={lineChartData.options}
                        series={lineChartData.series}
                        type="line"
                        height={250}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
