import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Brain, LogOut, Home, PlusCircle, BarChart3, BookOpen, FolderOpen, TrendingUp } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isFaculty = profile?.role === 'faculty';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <span className="text-xl font-display font-bold text-gradient">SmartQuiz</span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            {isFaculty ? (
              <>
                <Button variant="ghost" onClick={() => navigate('/create-quiz')}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
                <Button variant="ghost" onClick={() => navigate('/my-quizzes')}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Quizzes
                </Button>
                <Button variant="ghost" onClick={() => navigate('/performance')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/quiz-room')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Join Quiz
                </Button>
                <Button variant="ghost" onClick={() => navigate('/my-progress')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  My Progress
                </Button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b border-border bg-card p-2 flex gap-2 overflow-x-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <Home className="w-4 h-4 mr-1" />
          Home
        </Button>
        {isFaculty ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/create-quiz')}>
              <PlusCircle className="w-4 h-4 mr-1" />
              Create
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-quizzes')}>
              <FolderOpen className="w-4 h-4 mr-1" />
              Quizzes
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/performance')}>
              <BarChart3 className="w-4 h-4 mr-1" />
              Stats
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/quiz-room')}>
              <BookOpen className="w-4 h-4 mr-1" />
              Join
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-progress')}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Progress
            </Button>
          </>
        )}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
