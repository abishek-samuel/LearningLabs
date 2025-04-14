import { useState, useEffect } from "react";
import { Loader2, Download } from "lucide-react";

export function CourseLessonResources({ courseId, lessonId }: { courseId: number; lessonId: number }) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/courses/${courseId}/resources`)
      .then((res) => res.ok ? res.json() : [])
      .then((all: any[]) => {
        if (!ignore) {
          setResources(all.filter(r => r.lessonId === lessonId));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [courseId, lessonId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 border rounded-md p-3 bg-slate-50 dark:bg-slate-800/30">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading resources...</span>
      </div>
    );
  }

  if (!resources.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 border rounded-md p-3 bg-slate-50 dark:bg-slate-800/30">
        <Download className="h-4 w-4" />
        <span>No resources attached to this lesson yet.</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {resources.map((resource) => (
        <li key={resource.id}>
          <a
            href={`/api/resources/${resource.id}/download`}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4" />
            <span>{resource.filename}</span>
            <span className="text-xs text-slate-400 ml-2">{new Date(resource.uploadedAt).toLocaleDateString()}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
