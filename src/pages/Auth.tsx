import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { GraduationCap, Users, Brain, Sparkles } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type UserRole = 'faculty' | 'student';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      nameSchema.parse(signupName);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (signupPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, selectedRole);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully!');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft">
          <Brain className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12">
        <div className="max-w-lg text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Brain className="w-16 h-16 text-primary-foreground" />
            <h1 className="text-5xl font-display font-bold text-primary-foreground">SmartQuiz</h1>
          </div>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Empowering education through intelligent assessments
          </p>
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="glass rounded-xl p-4 text-center">
              <Sparkles className="w-8 h-8 text-quiz-yellow mx-auto mb-2" />
              <p className="text-sm font-medium text-primary-foreground">AI-Powered</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <Users className="w-8 h-8 text-quiz-yellow mx-auto mb-2" />
              <p className="text-sm font-medium text-primary-foreground">Collaborative</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <GraduationCap className="w-8 h-8 text-quiz-yellow mx-auto mb-2" />
              <p className="text-sm font-medium text-primary-foreground">Learn Better</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md shadow-large border-0 animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
              <Brain className="w-10 h-10 text-primary" />
              <span className="text-2xl font-display font-bold text-gradient">SmartQuiz</span>
            </div>
            <CardTitle className="text-2xl font-display">
              {authMode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {authMode === 'login' 
                ? 'Sign in to continue your learning journey' 
                : 'Join SmartQuiz to start creating and taking quizzes'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('student')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          selectedRole === 'student'
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <GraduationCap className={`w-8 h-8 ${selectedRole === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${selectedRole === 'student' ? 'text-primary' : 'text-muted-foreground'}`}>Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRole('faculty')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          selectedRole === 'faculty'
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Users className={`w-8 h-8 ${selectedRole === 'faculty' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${selectedRole === 'faculty' ? 'text-primary' : 'text-muted-foreground'}`}>Faculty</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
