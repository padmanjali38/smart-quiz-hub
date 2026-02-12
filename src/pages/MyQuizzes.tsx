import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, Clock, FileText, Eye, Play, CheckCircle, Loader2 } from "lucide-react";
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

const MyQuizzes = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== "faculty") {
      navigate("/");
      return;
    }
    fetchQuizzes();
  }, [user, profile, navigate]);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
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

  const filteredQuizzes = quizzes.filter(
    (quiz) =>
      quiz.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.quiz_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "created":
        return <FileText className="h-5 w-5 text-primary" />;
      case "live":
        return <Play className="h-5 w-5 text-blue-500" />;
      case "conducted":
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FileText className="h-5 w-5" />;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Quizzes</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view all your created quizzes
            </p>
          </div>
          <Button onClick={() => navigate("/create-quiz")} variant="quiz">
            Create New Quiz
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, topic, or quiz ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quizzes Grid */}
        {filteredQuizzes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No quizzes found</h3>
              <p className="text-muted-foreground text-center mt-1">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Create your first quiz to get started"}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate("/create-quiz")} className="mt-4" variant="quiz">
                  Create Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/quiz/${quiz.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(quiz.status)}
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {quiz.subject_name}
                      </CardTitle>
                    </div>
                    {getStatusBadge(quiz.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground font-medium">{quiz.topic}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(quiz.quiz_date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{quiz.quiz_time}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      {quiz.num_questions} questions
                    </span>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      ID: {quiz.quiz_id}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quiz/${quiz.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {quiz.status === "created" && (
                      <Button
                        size="sm"
                        variant="quiz"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/conduct-quiz/${quiz.id}`);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Conduct
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyQuizzes;
