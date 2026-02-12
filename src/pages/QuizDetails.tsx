import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Calendar, Clock, FileText, Play, CheckCircle, 
  Hash, Key, Users, BarChart3, Loader2 
} from "lucide-react";
import { format } from "date-fns";

interface Quiz {
  id: string;
  quiz_id: string;
  subject_name: string;
  topic: string;
  num_questions: number;
  quiz_date: string;
  quiz_time: string;
  passcode: string;
  status: string;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  question_order: number;
}

const QuizDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "faculty") {
      navigate("/");
      return;
    }
    if (id) {
      fetchQuizDetails();
    }
  }, [user, profile, id, navigate]);

  const fetchQuizDetails = async () => {
    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", id)
        .order("question_order", { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch attempt count
      const { count, error: countError } = await supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .eq("quiz_id", id);

      if (!countError && count !== null) {
        setAttemptCount(count);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/my-quizzes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return <Badge className="bg-primary/20 text-primary border-primary/30">Created</Badge>;
      case "live":
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Live</Badge>;
      case "conducted":
        return <Badge className="bg-muted text-muted-foreground border-muted">Conducted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Quiz not found</h2>
          <Button onClick={() => navigate("/my-quizzes")} className="mt-4">
            Back to My Quizzes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-quizzes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{quiz.subject_name}</h1>
              {getStatusBadge(quiz.status)}
            </div>
            <p className="text-muted-foreground mt-1">{quiz.topic}</p>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">{format(new Date(quiz.quiz_date), "MMM d, yyyy")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="p-2 rounded-lg bg-accent/50">
                <Clock className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-semibold">{quiz.quiz_time}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="p-2 rounded-lg bg-secondary">
                <FileText className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-semibold">{questions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attempts</p>
                <p className="font-semibold">{attemptCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Quiz ID</p>
                  <p className="font-mono font-semibold">{quiz.quiz_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Passcode</p>
                  <p className="font-mono font-semibold">{quiz.passcode}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {quiz.status === "created" && (
                <Button 
                  variant="hero" 
                  onClick={() => navigate(`/conduct-quiz/${quiz.id}`)}
                  className="flex-1 md:flex-none"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Conduct Quiz
                </Button>
              )}
              {quiz.status === "conducted" && (
                <Button 
                  variant="quiz" 
                  onClick={() => navigate(`/performance?quiz_id=${quiz.quiz_id}`)}
                  className="flex-1 md:flex-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Performance
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </span>
                  <p className="font-medium flex-1">{question.question_text}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 pl-11">
                  {[question.option_1, question.option_2, question.option_3, question.option_4].map(
                    (option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border ${
                          question.correct_option === optIndex + 1
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span>{option}</span>
                          {question.correct_option === optIndex + 1 && (
                            <CheckCircle className="h-4 w-4 ml-auto" />
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuizDetails;
