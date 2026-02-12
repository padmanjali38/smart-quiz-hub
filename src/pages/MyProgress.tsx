import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, Award, Target, Calendar, 
  ChevronRight, Loader2, BarChart3, CheckCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string | null;
  started_at: string;
  quiz?: {
    subject_name: string;
    topic: string;
    quiz_id: string;
  };
}

interface DetailedAnswer {
  id: string;
  question_id: string;
  selected_option: number | null;
  is_correct: boolean | null;
  question?: {
    question_text: string;
    option_1: string;
    option_2: string;
    option_3: string;
    option_4: string;
    correct_option: number;
  };
}

const MyProgress = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverall, setShowOverall] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [detailedAnswers, setDetailedAnswers] = useState<DetailedAnswer[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "student") {
      navigate("/");
      return;
    }
    fetchAttempts();
  }, [user, profile, navigate]);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          completed_at,
          started_at,
          quizzes:quiz_id (
            subject_name,
            topic,
            quiz_id
          )
        `)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setAttempts(data?.map(a => ({
        ...a,
        quiz: Array.isArray(a.quizzes) ? a.quizzes[0] : a.quizzes
      })) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttemptDetails = async (attempt: QuizAttempt) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from("student_answers")
        .select(`
          id,
          question_id,
          selected_option,
          is_correct,
          questions:question_id (
            question_text,
            option_1,
            option_2,
            option_3,
            option_4,
            correct_option
          )
        `)
        .eq("attempt_id", attempt.id);

      if (error) throw error;
      setDetailedAnswers(data?.map(a => ({
        ...a,
        question: Array.isArray(a.questions) ? a.questions[0] : a.questions
      })) || []);
      setSelectedAttempt(attempt);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Calculate overall stats
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(a => a.completed_at).length;
  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
  const averagePercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

  // Chart data
  const progressData = attempts
    .filter(a => a.completed_at)
    .slice(0, 10)
    .reverse()
    .map((a, index) => ({
      name: `Quiz ${index + 1}`,
      score: Math.round((a.score / a.total_questions) * 100),
      subject: a.quiz?.subject_name || "Unknown",
    }));

  const subjectPerformance = attempts.reduce((acc, a) => {
    const subject = a.quiz?.subject_name || "Unknown";
    if (!acc[subject]) {
      acc[subject] = { correct: 0, total: 0 };
    }
    acc[subject].correct += a.score;
    acc[subject].total += a.total_questions;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const subjectData = Object.entries(subjectPerformance).map(([name, data]) => ({
    name,
    percentage: Math.round((data.correct / data.total) * 100),
  }));

  const pieData = [
    { name: "Correct", value: totalScore },
    { name: "Incorrect", value: totalQuestions - totalScore },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
            <p className="text-muted-foreground mt-1">
              Track your quiz performance and improvement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="overall-mode"
              checked={showOverall}
              onCheckedChange={setShowOverall}
            />
            <Label htmlFor="overall-mode">Show Overall Progress</Label>
          </div>
        </div>

        {showOverall ? (
          /* Overall Progress View */
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quizzes Taken</p>
                      <p className="text-2xl font-bold">{completedAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/50">
                      <Award className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-2xl font-bold">{averagePercentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Correct Answers</p>
                      <p className="text-2xl font-bold">{totalScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Questions</p>
                      <p className="text-2xl font-bold">{totalQuestions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Progress Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, "Score"]}
                          labelFormatter={(label, payload) => 
                            payload[0]?.payload?.subject || label
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No quiz data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Overall Accuracy Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  {totalQuestions > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => 
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No quiz data yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subject-wise Performance */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Subject-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {subjectData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subjectData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                        <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No quiz data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : selectedAttempt ? (
          /* Selected Quiz Details */
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedAttempt(null)}>
              ← Back to all attempts
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedAttempt.quiz?.subject_name}</CardTitle>
                    <p className="text-muted-foreground">{selectedAttempt.quiz?.topic}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {selectedAttempt.score}/{selectedAttempt.total_questions} (
                    {Math.round((selectedAttempt.score / selectedAttempt.total_questions) * 100)}%)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingDetails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  detailedAnswers.map((answer, index) => (
                    <div
                      key={answer.id}
                      className={`p-4 rounded-lg border ${
                        answer.is_correct
                          ? "bg-primary/5 border-primary/20"
                          : "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-background border font-semibold text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium mb-3">{answer.question?.question_text}</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {[
                              answer.question?.option_1,
                              answer.question?.option_2,
                              answer.question?.option_3,
                              answer.question?.option_4,
                            ].map((option, optIndex) => {
                              const isSelected = answer.selected_option === optIndex + 1;
                              const isCorrect = answer.question?.correct_option === optIndex + 1;
                              return (
                                <div
                                  key={optIndex}
                                  className={`p-2 rounded border flex items-center gap-2 ${
                                    isCorrect
                                      ? "bg-primary/10 border-primary/30"
                                      : isSelected
                                      ? "bg-destructive/10 border-destructive/30"
                                      : "bg-muted/30"
                                  }`}
                                >
                                  <span className="font-medium">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <span className="flex-1">{option}</span>
                                  {isCorrect && <CheckCircle className="h-4 w-4 text-primary" />}
                                  {isSelected && !isCorrect && (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Quiz Attempts List */
          <div className="space-y-4">
            {attempts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No quizzes attempted yet</h3>
                  <p className="text-muted-foreground text-center mt-1">
                    Join a quiz to see your progress here
                  </p>
                  <Button onClick={() => navigate("/")} className="mt-4" variant="quiz">
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              attempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => fetchAttemptDetails(attempt)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          attempt.score / attempt.total_questions >= 0.7
                            ? "bg-primary/20 text-primary"
                            : attempt.score / attempt.total_questions >= 0.4
                            ? "bg-accent/50 text-accent-foreground"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        <span className="font-bold">
                          {Math.round((attempt.score / attempt.total_questions) * 100)}%
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{attempt.quiz?.subject_name || "Quiz"}</h3>
                        <p className="text-sm text-muted-foreground">
                          {attempt.quiz?.topic || "Unknown topic"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(attempt.started_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">
                          {attempt.score}/{attempt.total_questions}
                        </p>
                        <p className="text-sm text-muted-foreground">correct</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyProgress;
