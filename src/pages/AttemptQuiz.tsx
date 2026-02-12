import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, ArrowLeft, Play, Trophy, Loader2, Users, Clock } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  question_order: number;
  time_limit: number;
}

interface Quiz {
  id: string;
  subject_name: string;
  topic: string;
  num_questions: number;
  status: string;
  live_code: string | null;
}

const AttemptQuiz = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoJoinTriggered, setAutoJoinTriggered] = useState(false);

  // Check for stored passcode (from QuizRoom redirect)
  useEffect(() => {
    const storedPasscode = sessionStorage.getItem('quiz_passcode');
    if (storedPasscode && !autoJoinTriggered && profile?.id) {
      setPasscode(storedPasscode);
      sessionStorage.removeItem('quiz_passcode');
      setAutoJoinTriggered(true);
      // Trigger join automatically
      handleAutoJoin(storedPasscode);
    }
  }, [profile, autoJoinTriggered]);

  const handleAutoJoin = async (code: string) => {
    setIsLoading(true);
    try {
      const inputCode = code.trim().toUpperCase();
      
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('passcode', inputCode)
        .eq('is_active', true)
        .maybeSingle();

      if (quizError || !quizData) {
        setIsLoading(false);
        return;
      }

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('question_order');

      if (!questionsData?.length) {
        setIsLoading(false);
        return;
      }

      setQuiz({
        id: quizData.id,
        subject_name: quizData.subject_name,
        topic: quizData.topic,
        num_questions: quizData.num_questions,
        status: quizData.status,
        live_code: quizData.live_code,
      });
      setQuestions(questionsData);

      // Create attempt
      const { data: newAttempt } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizData.id,
          student_id: profile?.id,
          total_questions: questionsData.length,
        })
        .select()
        .single();

      if (newAttempt) {
        setAttemptId(newAttempt.id);
      }
    } catch (error) {
      console.error('Error auto joining:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Timer effect for each question
  useEffect(() => {
    if (!quiz || inWaitingRoom || quizCompleted || questions.length === 0) return;
    
    const currentQ = questions[currentQuestion];
    if (!currentQ) return;
    
    setTimeLeft(currentQ.time_limit);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Auto move to next question or submit
          if (currentQuestion === questions.length - 1) {
            handleSubmitQuiz();
          } else {
            setCurrentQuestion((c) => Math.min(questions.length - 1, c + 1));
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, quiz, inWaitingRoom, quizCompleted, questions]);

  // Listen for quiz status changes when in waiting room
  useEffect(() => {
    if (!inWaitingRoom || !quiz) return;

    const channel = supabase
      .channel(`quiz-${quiz.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
          filter: `id=eq.${quiz.id}`,
        },
        (payload) => {
          const updatedQuiz = payload.new as any;
          if (updatedQuiz.status === 'live' && updatedQuiz.session_started_at) {
            // Quiz has started! Exit waiting room and start quiz
            setInWaitingRoom(false);
            toast.success('Quiz has started! Good luck!');
          }
        }
      )
      .subscribe();

    // Also listen for student count updates
    const sessionChannel = supabase
      .channel(`sessions-${quiz.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `quiz_id=eq.${quiz.id}`,
        },
        async () => {
          // Refresh student count
          const { count } = await supabase
            .from('quiz_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);
          setStudentCount(count || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [inWaitingRoom, quiz]);

  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passcode.trim()) {
      toast.error('Please enter a passcode');
      return;
    }

    if (!profile?.id) {
      toast.error('Please login again');
      return;
    }

    setIsLoading(true);

    try {
      const inputCode = passcode.trim().toUpperCase();
      
      // First try to find by live_code (for live sessions)
      let quizData = null;
      let { data: liveQuiz } = await supabase
        .from('quizzes')
        .select('*')
        .eq('live_code', inputCode)
        .eq('is_active', true)
        .maybeSingle();

      if (liveQuiz) {
        quizData = liveQuiz;
      } else {
        // Try to find by passcode
        const { data: passcodeQuiz, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('passcode', inputCode)
          .eq('is_active', true)
          .maybeSingle();

        if (quizError || !passcodeQuiz) {
          toast.error('Invalid code. Please check and try again.');
          setIsLoading(false);
          return;
        }
        quizData = passcodeQuiz;
      }

      // Check if student already completed this quiz
      const { data: existingAttempt } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizData.id)
        .eq('student_id', profile.id)
        .maybeSingle();

      if (existingAttempt?.completed_at) {
        toast.error('You have already completed this quiz.');
        setIsLoading(false);
        return;
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('question_order');

      if (questionsError || !questionsData?.length) {
        toast.error('No questions found for this quiz.');
        setIsLoading(false);
        return;
      }

      setQuiz({
        id: quizData.id,
        subject_name: quizData.subject_name,
        topic: quizData.topic,
        num_questions: quizData.num_questions,
        status: quizData.status,
        live_code: quizData.live_code,
      });
      setQuestions(questionsData);

      // If quiz is in "created" or has a live_code but not started, join waiting room
      if (quizData.status === 'created' && quizData.live_code) {
        // Join the session
        const { error: sessionError } = await supabase
          .from('quiz_sessions')
          .upsert({
            quiz_id: quizData.id,
            student_id: profile.id,
          }, { onConflict: 'quiz_id,student_id' });

        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        // Get current student count
        const { count } = await supabase
          .from('quiz_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quizData.id);
        setStudentCount(count || 0);

        setInWaitingRoom(true);
        toast.success('Joined waiting room! Wait for faculty to start the quiz.');
      } else {
        // Quiz is live or ready to start directly
        // Create or get attempt
        let attempt;
        if (existingAttempt) {
          attempt = existingAttempt;
        } else {
          const { data: newAttempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .insert({
              quiz_id: quizData.id,
              student_id: profile.id,
              total_questions: questionsData.length,
            })
            .select()
            .single();

          if (attemptError) throw attemptError;
          attempt = newAttempt;
        }

        setAttemptId(attempt.id);
        toast.success('Quiz loaded! Good luck!');
      }

    } catch (error) {
      console.error('Error joining quiz:', error);
      toast.error('Failed to join quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // When exiting waiting room (quiz started), create attempt
  useEffect(() => {
    const createAttempt = async () => {
      if (!quiz || !profile?.id || inWaitingRoom || attemptId) return;

      try {
        const { data: existingAttempt } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quiz.id)
          .eq('student_id', profile.id)
          .maybeSingle();

        if (existingAttempt) {
          setAttemptId(existingAttempt.id);
        } else {
          const { data: newAttempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .insert({
              quiz_id: quiz.id,
              student_id: profile.id,
              total_questions: questions.length,
            })
            .select()
            .single();

          if (attemptError) throw attemptError;
          setAttemptId(newAttempt.id);
        }
      } catch (error) {
        console.error('Error creating attempt:', error);
      }
    };

    createAttempt();
  }, [quiz, profile, inWaitingRoom, attemptId, questions.length]);

  const handleSelectAnswer = (questionId: string, optionNumber: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionNumber,
    });
  };

  const handleSubmitQuiz = useCallback(async () => {
    if (!attemptId || !profile?.id) return;

    setIsLoading(true);

    try {
      // Calculate score
      let correctCount = 0;
      const answersToInsert = [];

      for (const question of questions) {
        const selectedOption = selectedAnswers[question.id];
        const isCorrect = selectedOption === question.correct_option;
        if (isCorrect) correctCount++;

        if (selectedOption) {
          answersToInsert.push({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option: selectedOption,
            is_correct: isCorrect,
          });
        }
      }

      // Save answers
      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('student_answers')
          .insert(answersToInsert);

        if (answersError) throw answersError;
      }

      // Update attempt with score
      const { error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          score: correctCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (updateError) throw updateError;

      // Remove from session
      if (quiz) {
        await supabase
          .from('quiz_sessions')
          .delete()
          .eq('quiz_id', quiz.id)
          .eq('student_id', profile.id);
      }

      setScore(correctCount);
      setQuizCompleted(true);
      toast.success('Quiz submitted successfully!');

    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, profile, questions, selectedAnswers, quiz]);

  // Passcode Entry Screen
  if (!quiz) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto animate-fade-in">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="border-0 shadow-large">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-display">Join Quiz</CardTitle>
              <CardDescription>
                Enter the passcode or live code provided by your faculty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinQuiz} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passcode">Quiz Code</Label>
                  <Input
                    id="passcode"
                    placeholder="Enter code (e.g., ABC123)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Join Quiz
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Waiting Room Screen
  if (inWaitingRoom) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center animate-fade-in">
          <Card className="border-0 shadow-large">
            <CardContent className="py-12">
              <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Users className="w-12 h-12 text-primary" />
              </div>
              
              <h1 className="text-2xl font-display font-bold mb-2">
                Waiting Room
              </h1>
              <p className="text-muted-foreground mb-6">
                {quiz.subject_name} - {quiz.topic}
              </p>

              <div className="bg-muted rounded-2xl p-6 mb-6">
                <p className="text-4xl font-display font-bold text-primary mb-2">
                  {studentCount}
                </p>
                <p className="text-muted-foreground">
                  {studentCount === 1 ? 'student' : 'students'} waiting
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Waiting for faculty to start the quiz...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Quiz Completed Screen
  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = percentage >= 40;

    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center animate-scale-in">
          <Card className="border-0 shadow-large">
            <CardContent className="py-12">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                isPassing ? 'bg-quiz-green-light' : 'bg-destructive/10'
              }`}>
                <Trophy className={`w-12 h-12 ${isPassing ? 'text-primary' : 'text-destructive'}`} />
              </div>
              
              <h1 className="text-3xl font-display font-bold mb-2">
                {isPassing ? 'Congratulations!' : 'Quiz Completed'}
              </h1>
              <p className="text-muted-foreground mb-8">
                {quiz.subject_name} - {quiz.topic}
              </p>

              <div className="bg-muted rounded-2xl p-6 mb-8">
                <p className="text-5xl font-display font-bold text-gradient mb-2">
                  {percentage}%
                </p>
                <p className="text-lg text-muted-foreground">
                  You scored {score} out of {questions.length} questions
                </p>
              </div>

              <Button variant="hero" size="lg" onClick={() => navigate('/')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Quiz Taking Screen
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Quiz Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-display font-bold">{quiz.subject_name}</h1>
              <p className="text-sm text-muted-foreground">{quiz.topic}</p>
            </div>
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
                  timeLeft <= 5 ? 'bg-destructive/20 text-destructive' : 'bg-accent text-primary'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="text-lg">{timeLeft}s</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {currentQuestion + 1} / {questions.length}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="border-0 shadow-large mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-display leading-relaxed">
              {question.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((optNum) => {
              const optionText = question[`option_${optNum}` as keyof Question] as string;
              const isSelected = selectedAnswers[question.id] === optNum;

              return (
                <button
                  key={optNum}
                  onClick={() => handleSelectAnswer(question.id, optNum)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                    isSelected
                      ? 'border-primary bg-accent'
                      : 'border-border hover:border-primary/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {String.fromCharCode(64 + optNum)}
                    </span>
                    <span className={isSelected ? 'font-medium' : ''}>{optionText}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              variant="hero"
              onClick={handleSubmitQuiz}
              disabled={isLoading || Object.keys(selectedAnswers).length < questions.length}
            >
              {isLoading ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              variant="quiz"
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            >
              Next
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="mt-8 p-4 bg-card rounded-xl shadow-soft">
          <p className="text-sm text-muted-foreground mb-3">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  index === currentQuestion
                    ? 'bg-primary text-primary-foreground'
                    : selectedAnswers[q.id]
                    ? 'bg-quiz-green-light text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttemptQuiz;