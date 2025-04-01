import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { CourseCard } from "@/components/dashboard/course-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Loader2
} from "lucide-react";

export default function CourseCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState("newest");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
  });

  // Filter courses based on search query and category
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = category === "all" || course.category === category;
    
    return matchesSearch && matchesCategory;
  });

  // Sort courses based on sort order
  const sortedCourses = filteredCourses ? [...filteredCourses].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortOrder === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortOrder === "az") {
      return a.title.localeCompare(b.title);
    } else if (sortOrder === "za") {
      return b.title.localeCompare(a.title);
    } else if (sortOrder === "popular") {
      // In a real app, we'd sort by enrollment count or rating
      return 0;
    }
    return 0;
  }) : [];

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl dark:text-white">
              Course Catalog
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Browse and discover courses to enhance your skills
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and filter section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="search"
              placeholder="Search courses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="it">IT & Software</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2 items-center">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Sort by</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={setSortOrder}>
                  <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="az">A-Z</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="za">Z-A</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="popular">Most Popular</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="rounded-none border-0"
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="sr-only">Grid view</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="rounded-none border-0"
              >
                <List className="h-4 w-4" />
                <span className="sr-only">List view</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Course list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="mt-4 text-slate-500 dark:text-slate-400">Loading courses...</p>
            </div>
          </div>
        ) : sortedCourses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              <Search className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No courses found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filter to find what you're looking for.
            </p>
            <div className="mt-6">
              <Button onClick={() => {
                setSearchQuery("");
                setCategory("all");
              }}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
              : "flex flex-col space-y-4"
          }>
            {sortedCourses.map((course) => (
              viewMode === "grid" ? (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  thumbnailUrl={course.thumbnail}
                  rating={4.5} // This would come from API in real application
                />
              ) : (
                <div 
                  key={course.id}
                  className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden flex flex-col sm:flex-row"
                >
                  <div className="sm:w-56 h-40 sm:h-auto bg-slate-200 dark:bg-slate-700 relative">
                    <img 
                      src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"} 
                      alt={course.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-accent text-white text-xs font-medium px-2 py-1 rounded">
                      4.5 ★
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1">{course.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{course.description}</p>
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-auto">
                      <div className="flex items-center mr-4">
                        <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        {course.difficulty || "Intermediate"}
                      </div>
                      <div className="flex items-center">
                        <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {course.duration ? `${course.duration} min` : "6 hours"}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button>View Course</Button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Pagination - would be implemented with API pagination in real app */}
        {!isLoading && sortedCourses.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="inline-flex rounded-md shadow">
              <Button variant="outline" className="rounded-l-md rounded-r-none">
                Previous
              </Button>
              <Button variant="outline" className="rounded-none bg-accent text-white">
                1
              </Button>
              <Button variant="outline" className="rounded-none">
                2
              </Button>
              <Button variant="outline" className="rounded-none">
                3
              </Button>
              <Button variant="outline" className="rounded-r-md rounded-l-none">
                Next
              </Button>
            </nav>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
