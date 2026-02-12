import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Clock, CheckCircle, ArrowLeft } from "lucide-react";

interface Quiz {
  id: string;
  quiz_id: string;
  subject_name: string;
  topic: string;
  num_questions: number;
  status: string;
  passcode: string;
}

const QuizRoom = () => {
  const { code } = useParams<{ code: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [inputCode, setInputCode] = useState(code || "");
  const [showCodeInput, setShowCodeInput] = useState(!code);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "student") {
      toast({
        title: "Access denied",
        description: "Only students can join quiz rooms",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    if (code) {
      joinQuizRoom(code);
    } else {
      setLoading(false);
    }
  }, [user, profile, code, navigate]);

  // Subscribe to quiz status changes
  useEffect(() => {
    if (!quiz?.id) return;

    const channel = supabase
      .channel(`quiz-status-${quiz.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quizzes",
          filter: `id=eq.${quiz.id}`,
        },
        (payload) => {
          const newQuiz = payload.new as any;
          if (newQuiz.status === "live" && newQuiz.session_started_at) {
            toast({
              title: "Quiz Started!",
              description: "The quiz is now live. Good luck!",
            });
            // Store passcode in session and navigate to attempt quiz
            sessionStorage.setItem('quiz_passcode', quiz.passcode);
            navigate('/attempt-quiz');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quiz?.id, quiz?.passcode, navigate, toast]);

  // Subscribe to student count
  useEffect(() => {
    if (!quiz?.id) return;

    const channel = supabase
      .channel(`quiz-sessions-count-${quiz.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_sessions",
          filter: `quiz_id=eq.${quiz.id}`,
        },
        () => {
          fetchStudentCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quiz?.id]);

  const fetchStudentCount = async () => {
    if (!quiz?.id) return;
    const { count } = await supabase
      .from("quiz_sessions")
      .select("*", { count: "exact", head: true })
      .eq("quiz_id", quiz.id);
    if (count !== null) setStudentCount(count);
  };

  const joinQuizRoom = async (roomCode: string) => {
    setLoading(true);
    setJoining(true);
    try {
      // Find quiz by live_code
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, quiz_id, subject_name, topic, num_questions, status, passcode")
        .eq("live_code", roomCode.toUpperCase())
        .single();

      if (quizError || !quizData) {
        toast({
          title: "Invalid code",
          description: "No quiz found with this code. Please check and try again.",
          variant: "destructive",
        });
        setShowCodeInput(true);
        setLoading(false);
        setJoining(false);
        return;
      }

      if (quizData.status === "conducted") {
        toast({
          title: "Quiz ended",
          description: "This quiz has already been conducted.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (quizData.status === "live") {
        // Quiz already started, store passcode and go directly to attempt
        sessionStorage.setItem('quiz_passcode', quizData.passcode);
        navigate('/attempt-quiz');
        return;
      }

      setQuiz(quizData);

      // Join the session
      const { error: joinError } = await supabase
        .from("quiz_sessions")
        .upsert({
          quiz_id: quizData.id,
          student_id: profile?.id,
        });

      if (joinError && !joinError.message.includes("duplicate")) {
        throw joinError;
      }

      setJoined(true);
      fetchStudentCount();
      toast({
        title: "Joined!",
        description: "You've joined the quiz room. Wait for the faculty to start.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setJoining(false);
    }
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      joinQuizRoom(inputCode.trim());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Joining quiz room...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showCodeInput || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Join Quiz</CardTitle>
            <p className="text-muted-foreground">
              Enter the quiz code provided by your instructor
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCode} className="space-y-4">
              <Input
                placeholder="Enter 6-digit code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-widest h-14"
                maxLength={6}
              />
              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={joining || inputCode.length < 6}
              >
                {joining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Join Quiz"
                )}
              </Button>
            </form>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're In!</CardTitle>
          <p className="text-muted-foreground">
            Waiting for the instructor to start the quiz
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">{quiz.subject_name}</h3>
            <p className="text-muted-foreground">{quiz.topic}</p>
            <div className="flex items-center gap-4 text-sm">
              <span>{quiz.num_questions} questions</span>
            </div>
          </div>

          {/* Waiting Animation */}
          <div className="text-center py-8">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground animate-pulse">
              Waiting for quiz to start...
            </p>
          </div>

          {/* Student Count */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>{studentCount} student{studentCount !== 1 ? "s" : ""} waiting</span>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Leave Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizRoom;
