import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Question = {
  id: number;
  questionText: string;
  options: string[];
  difficulty: string;
};

export default function AssessmentPage() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = new URLSearchParams(search);
  const moduleId = queryParams.get("moduleId");
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start assessment attempt on mount
  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/modules/${moduleId}/assessment-attempts/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to start assessment");
        }
        return res.json();
      })
      .then((data) => {
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setAnswers({});
        setResult(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  const handleSelect = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    setError(null);
    const answerArray = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] || "",
    }));
    try {
      const res = await fetch(`/api/assessment-attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit assessment");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    // Just reload the page to start a new attempt
    setLocation(location);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Module Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-600 text-center py-4">{error}</div>
            ) : result ? (
              <div className="text-center space-y-4">
                <div
                  className={`text-2xl font-bold ${
                    result.passed ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {result.passed ? "Passed!" : "Failed"}
                </div>
                <div>
                  Score: <span className="font-semibold">{result.score}%</span>{" "}
                  ({result.correct} / {result.total} correct)
                </div>
                {!result.passed && (
                  <Button onClick={handleRetake}>Retake Assessment</Button>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="space-y-6"
              >
                {questions.map((q, idx) => (
                  <div key={q.id} className="mb-4">
                    <div className="font-medium mb-2">
                      {idx + 1}. {q.questionText}
                      <span className="ml-2 text-xs text-slate-400">
                        ({q.difficulty})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Array.isArray(q.options)
                        ? q.options.map((opt, i) => (
                            <label
                              key={i}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => handleSelect(q.id, opt)}
                                disabled={submitting}
                              />
                              <span>{opt}</span>
                            </label>
                          ))
                        : null}
                    </div>
                  </div>
                ))}
                <Button
                  type="submit"
                  disabled={submitting || Object.keys(answers).length !== 10}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Submit Assessment
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
