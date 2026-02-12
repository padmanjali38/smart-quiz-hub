import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, PlusCircle, BarChart3, BookOpen, Trophy, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft">
          <Brain className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const isFaculty = profile.role === 'faculty';

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Welcome back, <span className="text-gradient">{profile.full_name || 'User'}</span>!
          </h1>
          <p className="text-muted-foreground text-lg">
            {isFaculty 
              ? 'Manage your quizzes and track student performance' 
              : 'Ready to test your knowledge? Let\'s get started!'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {isFaculty ? (
            <>
              <Card 
                className="cursor-pointer card-hover group border-0 shadow-medium"
                onClick={() => navigate('/create-quiz')}
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <PlusCircle className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="font-display">Create Quiz</CardTitle>
                  <CardDescription>
                    Design new quizzes manually or use AI to generate questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="quiz" className="w-full">
                    Create New Quiz
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer card-hover group border-0 shadow-medium"
                onClick={() => navigate('/my-quizzes')}
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-7 h-7 text-secondary-foreground" />
                  </div>
                  <CardTitle className="font-display">My Quizzes</CardTitle>
                  <CardDescription>
                    View and manage all your previously created quizzes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="quiz-secondary" className="w-full">
                    View My Quizzes
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer card-hover group border-0 shadow-medium"
                onClick={() => navigate('/performance')}
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-quiz-yellow-light to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-7 h-7 text-quiz-orange" />
                  </div>
                  <CardTitle className="font-display">View Performance</CardTitle>
                  <CardDescription>
                    Analyze student results and track quiz performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card 
                className="cursor-pointer card-hover group border-0 shadow-medium"
                onClick={() => navigate('/attempt-quiz')}
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="font-display">Attempt Quiz</CardTitle>
                  <CardDescription>
                    Enter the quiz passcode provided by your faculty to join
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="hero" className="w-full">
                    Join Quiz
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer card-hover group border-0 shadow-medium"
                onClick={() => navigate('/my-progress')}
              >
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-quiz-yellow-light to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="w-7 h-7 text-quiz-orange" />
                  </div>
                  <CardTitle className="font-display">Track Progress</CardTitle>
                  <CardDescription>
                    View your quiz history and overall performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="quiz-secondary" className="w-full">
                    View My Progress
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-medium bg-gradient-to-br from-accent to-quiz-green-light">
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="font-display">Live Quizzes</CardTitle>
                  <CardDescription>
                    Join live quiz sessions conducted by your faculty
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use the passcode to enter the waiting room
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-6 rounded-2xl bg-card shadow-soft border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-quiz-green-light flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">Smart</p>
                <p className="text-sm text-muted-foreground">Learning Platform</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-card shadow-soft border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-quiz-yellow-light flex items-center justify-center">
                <Users className="w-6 h-6 text-quiz-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">Easy</p>
                <p className="text-sm text-muted-foreground">Quiz Management</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-card shadow-soft border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">Instant</p>
                <p className="text-sm text-muted-foreground">Results & Analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
