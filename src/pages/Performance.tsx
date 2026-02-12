import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Users, Trophy, Target, AlertCircle } from 'lucide-react';

interface PerformanceData {
  quiz: {
    subject_name: string;
    topic: string;
    quiz_date: string;
    num_questions: number;
  };
  attempts: {
    id: string;
    student_name: string;
    student_email: string;
    score: number;
    total_questions: number;
    completed_at: string | null;
  }[];
}

const Performance = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [quizId, setQuizId] = useState('');
  const [quizDate, setQuizDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quizId.trim()) {
      toast.error('Please enter a Quiz ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPerformanceData(null);

    try {
      // Find the quiz
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_id', quizId.trim())
        .eq('faculty_id', profile?.id);

      if (quizDate) {
        query = query.eq('quiz_date', quizDate);
      }

      const { data: quiz, error: quizError } = await query.single();

      if (quizError || !quiz) {
        setError('No quiz found with this ID. Please check the Quiz ID and try again.');
        setIsLoading(false);
        return;
      }

      // Get attempts for this quiz
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          total_questions,
          completed_at,
          student_id
        `)
        .eq('quiz_id', quiz.id);

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        setError('Quiz found but no students have attempted it yet.');
        setPerformanceData({
          quiz: {
            subject_name: quiz.subject_name,
            topic: quiz.topic,
            quiz_date: quiz.quiz_date,
            num_questions: quiz.num_questions,
          },
          attempts: [],
        });
        setIsLoading(false);
        return;
      }

      // Get student profiles
      const studentIds = attempts.map(a => a.student_id);
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      const formattedAttempts = attempts.map(a => {
        const student = studentMap.get(a.student_id);
        return {
          id: a.id,
          student_name: student?.full_name || 'Unknown',
          student_email: student?.email || '',
          score: a.score,
          total_questions: a.total_questions,
          completed_at: a.completed_at,
        };
      });

      setPerformanceData({
        quiz: {
          subject_name: quiz.subject_name,
          topic: quiz.topic,
          quiz_date: quiz.quiz_date,
          num_questions: quiz.num_questions,
        },
        attempts: formattedAttempts,
      });

    } catch (error) {
      console.error('Error fetching performance:', error);
      toast.error('Failed to fetch performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const averageScore = performanceData?.attempts.length
    ? Math.round(
        (performanceData.attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) /
          performanceData.attempts.length)
      )
    : 0;

  const highestScore = performanceData?.attempts.length
    ? Math.max(...performanceData.attempts.map(a => Math.round((a.score / a.total_questions) * 100)))
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Quiz Performance</h1>
          <p className="text-muted-foreground">
            View student performance for your quizzes
          </p>
        </div>

        {/* Search Form */}
        <Card className="border-0 shadow-medium mb-8">
          <CardHeader>
            <CardTitle className="font-display">Search Quiz</CardTitle>
            <CardDescription>Enter Quiz ID and optionally a date to view results</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="quiz-id">Quiz ID</Label>
                <Input
                  id="quiz-id"
                  placeholder="Enter Quiz ID (e.g., QZ123ABC)"
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date (Optional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={quizDate}
                  onChange={(e) => setQuizDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="quiz" disabled={isLoading}>
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && !performanceData?.attempts.length && (
          <Card className="border-0 shadow-medium bg-muted/50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold mb-2">{error}</h3>
              <p className="text-muted-foreground">
                Try searching with a different Quiz ID or check if students have taken the quiz.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {performanceData && performanceData.attempts.length > 0 && (
          <>
            {/* Quiz Info */}
            <Card className="border-0 shadow-soft mb-6">
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-semibold">{performanceData.quiz.subject_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Topic</p>
                    <p className="font-semibold">{performanceData.quiz.topic}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{performanceData.quiz.quiz_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-semibold">{performanceData.quiz.num_questions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card className="border-0 shadow-soft">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-quiz-green-light flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{performanceData.attempts.length}</p>
                      <p className="text-sm text-muted-foreground">Attempts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-soft">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-quiz-yellow-light flex items-center justify-center">
                      <Target className="w-6 h-6 text-quiz-orange" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{averageScore}%</p>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-soft">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">{highestScore}%</p>
                      <p className="text-sm text-muted-foreground">Highest Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card className="border-0 shadow-medium">
              <CardHeader>
                <CardTitle className="font-display">Student Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">{attempt.student_name}</TableCell>
                        <TableCell>{attempt.student_email}</TableCell>
                        <TableCell className="text-center">
                          {attempt.score} / {attempt.total_questions}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (attempt.score / attempt.total_questions) * 100 >= 70
                              ? 'bg-quiz-green-light text-primary'
                              : (attempt.score / attempt.total_questions) * 100 >= 40
                              ? 'bg-quiz-yellow-light text-secondary-foreground'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {Math.round((attempt.score / attempt.total_questions) * 100)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {attempt.completed_at
                            ? new Date(attempt.completed_at).toLocaleString()
                            : 'In Progress'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Performance;
