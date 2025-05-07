import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { MoonIcon, SunIcon, BookOpen, GraduationCap, BarChart3, CheckCircle2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const { theme, setTheme } = useTheme();

  // Redirect to dashboard if already authenticated
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Left side - Auth forms */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full lg:w-1/2 relative mx-2">
        <div className="flex items-center justify-between h-16 fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 p-4 lg:hidden">
          <img
            src="../../../alten_black.png"
            className="mt-1 mr-2 dark:hidden w-[130px]"
            title="Alten Global Technologies Private Limited"
            alt="Alten Global Technologies Private Limited"
          />
          <img
            src="../../../alten_W.png"
            className="mt-1 mr-2 hidden dark:block w-[130px]"
            title="Alten Global Technologies Private Limited"
            alt="Alten Global Technologies Private Limited"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5 text-yellow-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-slate-700" />
            )}
          </Button>
        </div>

        {/* Desktop & tablet header (unchanged) */}
        {/* <div className="flex items-center justify-between mt-0 ml-0 lg:mt-[-72px] lg:ml-[-70px]"> */}
        <div className="flex items-center justify-between mt-0 ml-0 lg:mt-0 lg:ml-0 absolute -top-5 left-0 right-0">
          {/* First image (visible on both screen sizes) */}
          <img
            src="../../../alten_black.png"
            className="mt-1 mr-2 dark:hidden w-[130px] md:w-[100px] lg:w-[130px]"
            title="Alten Global Technologies Private Limited"
            alt="Alten Global Technologies Private Limited"
          />

          {/* Second image (visible on both screen sizes) */}
          <img
            src="../../../alten_W.png"
            className="mt-1 mr-2 hidden dark:block w-[130px] md:w-[100px] lg:w-[130px]"
            title="Alten Global Technologies Private Limited"
            alt="Alten Global Technologies Private Limited"
          />

          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5 text-yellow-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-slate-700" />
            )}
          </Button>
        </div>


        <div className="mx-auto w-full max-w-sm lg:w-[420px] sm:mt-16 lg:mt-[10px]"> {/* Added padding-top to account for the fixed header */}
          <div className="text-center lg:text-left mb-8">
            <div className="flex items-center mb-3">
              {/* <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400 mr-3" /> */}
              {/* <span className="text-2xl font-semibold bg-gradient-to-r from-blue-700 via-purple-700 to-black bg-clip-text text-transparent font-[Roboto] tracking-wide dark:from-blue-600 dark:via-purple-600 dark:to-blue-800 dark:text-transparent">
                Learning Lab
              </span> */}
              <img
                src="../../../blue.png"
                className="mt-1 mb-1 mr-2 w-[130px]"
                title="Learning Labs"
                alt="Learning Labs"
              />

              {/* <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Learning Labs
              </h2> */}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A modern learning management system for organizations
            </p>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <div>
              <Card className="border-slate-200 dark:border-slate-700" style={{ marginTop: "-20px" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl" style={{ marginTop: "-17px" }}>
                    Sign in to your account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LoginForm />
                </CardContent>
              </Card>
            </div>
          </Tabs>
        </div>
      </div>



      {/* Right side - Hero section */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          <div className="relative z-10 flex flex-col justify-center items-start h-full px-16 text-white -mt-10">
            <h1 className="text-4xl font-bold mb-8 leading-tight">Enhance your skills with our modern learning platform</h1>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-500/30 p-3 rounded-lg mr-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Comprehensive Courses</h3>
                  <p className="text-blue-100 text-sm">Access hundreds of courses across various disciplines</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-500/30 p-3 rounded-lg mr-4">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Learn at Your Own Pace</h3>
                  <p className="text-blue-100 text-sm">Flexible learning schedule that fits your busy lifestyle</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-500/30 p-3 rounded-lg mr-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Professional Certificates</h3>
                  <p className="text-blue-100 text-sm">Earn recognized certificates upon course completion</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-500/30 p-3 rounded-lg mr-4">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Track Your Progress</h3>
                  <p className="text-blue-100 text-sm">Visual analytics to monitor your learning journey</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 right-8 text-xs text-blue-200 opacity-70">
              © 2025 Learning Labs. All rights reserved.
            </div>
          </div>

          {/* Abstract shapes for visual interest */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-indigo-900/30 to-transparent"></div>
          <div className="absolute top-[15%] right-[10%] w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"></div>
          <div className="absolute bottom-[20%] left-[5%] w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}
