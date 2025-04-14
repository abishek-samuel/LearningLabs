import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModuleAssessmentStatus({ moduleId }: { moduleId: number }) {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/modules/${moduleId}/lessons`) // Use lessons endpoint to check if module exists
      .then(res => res.ok ? res.json() : [])
      .then(() =>
        fetch(`/api/modules/${moduleId}/questions`)
          .then(res => res.ok ? res.json() : [])
          .then((questions: any[]) => {
            setQuestionCount(Array.isArray(questions) ? questions.length : 0);
            setLoading(false);
          })
          .catch(() => {
            setQuestionCount(0);
            setLoading(false);
          })
      )
      .catch(() => {
        setQuestionCount(0);
        setLoading(false);
      });
  }, [moduleId]);

  if (loading) {
    return (
      <div className="p-2 text-xs text-slate-400 flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking assessment...
      </div>
    );
  }

  if (questionCount && questionCount >= 10) {
    return (
      <div className="p-2 text-xs text-green-600">
        Assessment available
      </div>
    );
  }

  return (
    <div className="p-2 text-xs text-slate-400">
      Assessment questions have not been generated for this module yet.
    </div>
  );
}
