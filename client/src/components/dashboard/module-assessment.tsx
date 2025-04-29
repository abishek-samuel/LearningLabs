import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ModuleAssessment({
  moduleId,
  onPassed,
}: {
  moduleId: number;
  onPassed?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);

  // Fetch question count to determine if assessment is available
  useEffect(() => {
    setLoading(true);
    fetch(`/api/modules/${moduleId}/questions`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((questions: any[]) => {
        setQuestionCount(Array.isArray(questions) ? questions.length : 0);
        setLoading(false);
      })
      .catch(() => {
        setQuestionCount(0);
        setLoading(false);
      });
  }, [moduleId]);

  // Start assessment attempt on mount (if available)
  useEffect(() => {
    if (questionCount === null || questionCount < 4) return;
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
        console.log(data);

        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setAnswers({});
        setResult(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleId, questionCount]);

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

    console.log(answerArray, questions);
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
      if (data.passed && onPassed) onPassed();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAttemptId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError(null);
    setLoading(true);
    setTimeout(() => setQuestionCount((c) => c), 10);
  };

  if (questionCount === null) {
    return null;
  }
  if (questionCount < 1) {
    return (
      <div className="my-6 p-4 rounded bg-slate-50 dark:bg-slate-800/30 text-slate-500 text-center">
        Assessment questions have not been generated for this module yet.
      </div>
    );
  }

  return (
    <div className="my-6 max-w-2xl mx-auto">
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
                Score: <span className="font-semibold">{result.score}%</span> (
                {result.correct} / {result.total} correct)
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
                    {q.options && typeof q.options === "object"
                      ? Object.values(q.options).map(
                          (opt: string, i: number) => (
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
                          )
                        )
                      : null}
                  </div>
                </div>
              ))}

              <Button
                type="submit"
                disabled={submitting || Object.keys(answers).length !== 1}
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
  );
}
