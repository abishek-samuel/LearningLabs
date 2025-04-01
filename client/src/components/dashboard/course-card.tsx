import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface CourseCardProps {
  id: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  progress?: number;
  rating?: number;
  isInProgress?: boolean;
  className?: string;
}

export function CourseCard({
  id,
  title,
  description,
  thumbnailUrl,
  progress = 0,
  rating,
  isInProgress = false,
  className,
}: CourseCardProps) {
  const defaultThumbnail = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80";

  return (
    <div className={cn("bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden flex flex-col", className)}>
      <div className="h-40 bg-slate-200 dark:bg-slate-700 relative">
        <img 
          src={thumbnailUrl || defaultThumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {rating && (
          <div className="absolute top-2 right-2 bg-accent text-white text-xs font-medium px-2 py-1 rounded">
            {rating} ★
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-1">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{description}</p>
        
        {isInProgress && (
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-t border-slate-200 dark:border-slate-700">
        <Link href={isInProgress ? `/course/${id}/learn` : `/course/${id}`}>
          <a className="inline-flex items-center justify-center w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            {isInProgress ? "Continue Learning" : "View Course"}
          </a>
        </Link>
      </div>
    </div>
  );
}

export default CourseCard;
