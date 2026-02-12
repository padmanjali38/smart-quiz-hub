import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { 
  ArrowLeft, Users, Play, Copy, Check, Loader2, Clock, FileText 
} from "lucide-react";

interface Quiz {
  id: string;
  quiz_id: string;
  subject_name: string;
  topic: string;
  num_questions: number;
  status: string;
  live_code: string | null;
}

interface JoinedStudent {
  id: string;
  student_id: string;
  joined_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

const ConductQuiz = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [liveCode, setLiveCode] = useState<string>("");
  const [joinedStudents, setJoinedStudents] = useState<JoinedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

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
      initializeQuizSession();
    }
  }, [user, profile, id, navigate]);

  // Subscribe to real-time student joins
  useEffect(() => {
    if (!quiz?.id) return;

    const channel = supabase
      .channel(`quiz-sessions-${quiz.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quiz_sessions",
          filter: `quiz_id=eq.${quiz.id}`,
        },
        () => {
          fetchJoinedStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quiz?.id]);

  const generateLiveCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const initializeQuizSession = async () => {
    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, quiz_id, subject_name, topic, num_questions, status, live_code")
        .eq("id", id)
        .single();

      if (quizError) throw quizError;

      if (quizData.status !== "created") {
        toast({
          title: "Quiz already conducted",
          description: "This quiz has already been conducted or is currently live.",
          variant: "destructive",
        });
        navigate(`/quiz/${id}`);
        return;
      }

      // Generate live code if not exists
      let code = quizData.live_code;
      if (!code) {
        code = generateLiveCode();
        const { error: updateError } = await supabase
          .from("quizzes")
          .update({ live_code: code })
          .eq("id", id);

        if (updateError) throw updateError;
      }

      setQuiz({ ...quizData, live_code: code });
      setLiveCode(code);
      fetchJoinedStudents();
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

  const fetchJoinedStudents = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("quiz_sessions")
      .select(`
        id,
        student_id,
        joined_at,
        profiles:student_id (
          full_name,
          email
        )
      `)
      .eq("quiz_id", id);

    if (!error && data) {
      setJoinedStudents(data.map(s => ({
        ...s,
        profile: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      })));
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(liveCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Quiz code copied to clipboard",
    });
  };

  const handleStartQuiz = async () => {
    if (joinedStudents.length === 0) {
      toast({
        title: "No students joined",
        description: "Wait for at least one student to join before starting.",
        variant: "destructive",
      });
      return;
    }

    setStarting(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ 
          status: "live",
          session_started_at: new Date().toISOString(),
          is_active: true
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Quiz Started!",
        description: `${joinedStudents.length} students can now attempt the quiz.`,
      });

      // Navigate to performance page to monitor
      navigate(`/quiz/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStarting(false);
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

  const joinUrl = `${window.location.origin}/quiz-room/${liveCode}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/quiz/${quiz.id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conduct Quiz</h1>
            <p className="text-muted-foreground">
              {quiz.subject_name} - {quiz.topic}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code and Join Info */}
          <Card className="lg:row-span-2">
            <CardHeader className="text-center">
              <CardTitle>Join Quiz</CardTitle>
              <p className="text-muted-foreground">
                Students can scan the QR code or enter the code below
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <QRCodeDisplay value={joinUrl} size={250} />
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Or enter this code:</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold font-mono tracking-widest text-primary">
                    {liveCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="w-full p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground break-all">{joinUrl}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quiz Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quiz ID</span>
                <span className="font-mono font-semibold">{quiz.quiz_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-semibold">{quiz.num_questions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-primary/20 text-primary">Ready</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Joined Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Joined Students
                <Badge variant="secondary" className="ml-auto">
                  {joinedStudents.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {joinedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Waiting for students to join...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {joinedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(student.profile?.full_name || student.profile?.email || "S")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {student.profile?.full_name || "Student"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.profile?.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Start Button */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <h3 className="font-semibold text-lg">Ready to start?</h3>
              <p className="text-muted-foreground">
                {joinedStudents.length} student{joinedStudents.length !== 1 ? "s" : ""} waiting
              </p>
            </div>
            <Button
              variant="hero"
              size="lg"
              onClick={handleStartQuiz}
              disabled={starting || joinedStudents.length === 0}
              className="min-w-[150px]"
            >
              {starting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ConductQuiz;
