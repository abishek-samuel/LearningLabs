import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const courseFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." })
    .max(500),
  categoryId: z.number({ required_error: "Category is required." }).int(),
  thumbnail: z.string().optional(), // Now optional to support no selection
});

type CourseFormData = z.infer<typeof courseFormSchema>;

interface CourseFormProps {
  initialData?: Partial<CourseFormData> & { id: number; name: string };
  onSubmit: (data: CourseFormData) => Promise<void>;
  isSubmitting: boolean;
}

const fetchCourseImages = async (
  courseId: number,
  courseName: string,
  minCount = 4,
  delay = 3000
): Promise<string[]> => {
  let images: string[] = [];

  while (images.length < minCount) {
    try {
      const response = await fetch(
        `/api/course-images/${courseId}/${courseName}`
      );
      const data: string[] = await response.json();

      if (data.length > images.length) {
        images = data;
      }

      if (images.length < minCount) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      break;
    }
  }

  return images;
};

export function CourseForm({
  initialData,
  onSubmit,
  isSubmitting,
}: CourseFormProps) {
  const queryClient = useQueryClient();
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageOptions, setImageOptions] = useState<string[]>([]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      categoryId: initialData?.categoryId ?? undefined,
      thumbnail: initialData?.thumbnail || "",
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
  }, []);

  useEffect(() => {
    if (!initialData?.id || !initialData?.title) return;

    const loadImages = async () => {
      setLoadingImages(true);
      const images = await fetchCourseImages(initialData.id, initialData.title);

      if (images.length > 0) {
        setImageOptions(images);

        const fullThumbnail = initialData.thumbnail || "";
        const matchedRelativePath = images.find((imgPath) =>
          fullThumbnail.endsWith(imgPath)
        );

        if (matchedRelativePath) {
          form.setValue("thumbnail", matchedRelativePath);
        }
      }

      setLoadingImages(false);
    };

    loadImages();
  }, [initialData]);

  const handleSubmit = async (data: CourseFormData) => {
    const fullThumbnailUrl = data.thumbnail
      ? `http://localhost:5000/${data.thumbnail}`.replace(/(?<!:)\/{2,}/g, "/")
      : "";

    await onSubmit({ ...data, thumbnail: fullThumbnailUrl });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Introduction to Web Development"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief overview of the course content and learning objectives."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                value={field.value?.toString() || ""}
                onValueChange={(value) => field.onChange(parseInt(value, 10))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Selection */}
        {initialData && (
          <FormField
            control={form.control}
            name="thumbnail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Course Image (choose one image)
                  <span
                    className="ml-2 px-1.5 mt-1 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded shadow-sm"
                    style={{
                      fontFamily: "monospace",
                      letterSpacing: "0.5px",
                    }}
                  >
                    AI
                  </span>
                </FormLabel>
                <FormControl>
                  <>
                    {loadingImages ? (
                      <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                        <p>Generating course images...</p>
                      </div>
                    ) : imageOptions.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {imageOptions.map((path, index) => (
                          <div
                            key={index}
                            onClick={() => field.onChange(path)}
                            className={`cursor-pointer rounded-lg overflow-hidden border ${
                              field.value === path
                                ? "ring-2 ring-blue-500 border-blue-400"
                                : "border-gray-300"
                            }`}
                          >
                            <img
                              src={`http://localhost:5000/${path}`}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <p>No images found.</p>
                      </div>
                    )}
                  </>
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : initialData ? (
            "Save Changes"
          ) : (
            "Create Course"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default CourseForm;
