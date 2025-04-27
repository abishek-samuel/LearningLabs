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
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type CourseType = {
  id: number;
  title: string;
  description: string;
  thumbnail?: string | null;
  category?: string | null;
  createdAt: string;
  difficulty?: string | null;
  duration?: number | null;
};

type Category = {
  id: number;
  name: string;
};

export default function CourseCatalog() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const coursesPerPage = 8;
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/courses", user?.id] });
  }, [user?.id]);

  const { data: courses = [], isLoading } = useQuery<CourseType[]>({
    queryKey: ["/api/courses", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Filter courses based on search query and category
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      (course.title &&
        course.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.description &&
        course.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      category === "all" || course.categoryId === Number(category);

    return matchesSearch && matchesCategory;
  });

  // Sort courses based on sort order
  const sortedCourses = filteredCourses
    ? [...filteredCourses].sort((a, b) => {
        if (sortOrder === "newest") {
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        } else if (sortOrder === "oldest") {
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        } else if (sortOrder === "az") {
          return (a.title || "").localeCompare(b.title || "");
        } else if (sortOrder === "za") {
          return (b.title || "").localeCompare(a.title || "");
        }
        return 0;
      })
    : [];
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      setCategories(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6 md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl dark:text-white">
              Course Catalog
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Browse your available courses
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
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
                <DropdownMenuRadioGroup
                  value={sortOrder}
                  onValueChange={setSortOrder}
                >
                  <DropdownMenuRadioItem value="newest">
                    Newest
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">
                    Oldest
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="az">A-Z</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="za">Z-A</DropdownMenuRadioItem>
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="mt-4 text-slate-500 dark:text-slate-400">
                Loading courses...
              </p>
            </div>
          </div>
        ) : sortedCourses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              <Search className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              No courses found
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filter to find what you're looking
              for.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "flex flex-col space-y-4"
              }
            >
              {sortedCourses
                .slice(
                  (currentPage - 1) * coursesPerPage,
                  currentPage * coursesPerPage
                )
                .map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    thumbnailUrl={course.thumbnail ?? undefined}
                    rating={4.5}
                  />
                ))}
            </div>

            <div className="mt-8 flex justify-center">
              <nav className="inline-flex rounded-md shadow">
                <Button
                  variant="outline"
                  className="rounded-l-md rounded-r-none"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from(
                  { length: Math.ceil(sortedCourses.length / coursesPerPage) },
                  (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      className="rounded-none"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  className="rounded-r-md rounded-l-none"
                  disabled={
                    currentPage ===
                    Math.ceil(sortedCourses.length / coursesPerPage)
                  }
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(
                        p + 1,
                        Math.ceil(sortedCourses.length / coursesPerPage)
                      )
                    )
                  }
                >
                  Next
                </Button>
              </nav>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
