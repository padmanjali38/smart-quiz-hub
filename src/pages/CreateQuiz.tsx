import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, Sparkles, ArrowLeft, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Question {
  id: string;
  question_text: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_option: number;
  time_limit: number;
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [quizData, setQuizData] = useState({
    subject_name: '',
    topic: '',
    quiz_date: '',
    quiz_time: '',
    quiz_id: '',
    passcode: '',
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: crypto.randomUUID(),
      question_text: '',
      option_1: '',
      option_2: '',
      option_3: '',
      option_4: '',
      correct_option: 1,
      time_limit: 30,
    },
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: '',
        option_1: '',
        option_2: '',
        option_3: '',
        option_4: '',
        correct_option: 1,
        time_limit: 30,
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const generateQuizId = () => {
    const id = `QZ${Date.now().toString(36).toUpperCase()}`;
    setQuizData({ ...quizData, quiz_id: id });
  };

  const generatePasscode = () => {
    const passcode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setQuizData({ ...quizData, passcode });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast.error('Please login again');
      return;
    }

    // Validate all fields
    if (!quizData.subject_name || !quizData.topic || !quizData.quiz_date || 
        !quizData.quiz_time || !quizData.quiz_id || !quizData.passcode) {
      toast.error('Please fill in all quiz details');
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question_text || !q.option_1 || !q.option_2 || !q.option_3 || !q.option_4) {
        toast.error('Please fill in all question fields');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          faculty_id: profile.id,
          subject_name: quizData.subject_name,
          topic: quizData.topic,
          num_questions: questions.length,
          quiz_date: quizData.quiz_date,
          quiz_time: quizData.quiz_time,
          quiz_id: quizData.quiz_id,
          passcode: quizData.passcode,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      const questionsData = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        option_1: q.option_1,
        option_2: q.option_2,
        option_3: q.option_3,
        option_4: q.option_4,
        correct_option: q.correct_option,
        question_order: index + 1,
        time_limit: q.time_limit,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) throw questionsError;

      toast.success('Quiz created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      if (error.message?.includes('duplicate key')) {
        toast.error('A quiz with this ID already exists. Please generate a new ID.');
      } else {
        toast.error('Failed to create quiz. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Create New Quiz</h1>
          <p className="text-muted-foreground">
            Fill in the details and add questions for your quiz
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Details Card */}
          <Card className="border-0 shadow-medium">
            <CardHeader>
              <CardTitle className="font-display">Quiz Details</CardTitle>
              <CardDescription>Basic information about your quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Name</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Mathematics"
                    value={quizData.subject_name}
                    onChange={(e) => setQuizData({ ...quizData, subject_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Algebra Basics"
                    value={quizData.topic}
                    onChange={(e) => setQuizData({ ...quizData, topic: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={quizData.quiz_date}
                    onChange={(e) => setQuizData({ ...quizData, quiz_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={quizData.quiz_time}
                    onChange={(e) => setQuizData({ ...quizData, quiz_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quiz-id">Quiz ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="quiz-id"
                      placeholder="Click generate"
                      value={quizData.quiz_id}
                      onChange={(e) => setQuizData({ ...quizData, quiz_id: e.target.value })}
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateQuizId}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passcode">Passcode</Label>
                  <div className="flex gap-2">
                    <Input
                      id="passcode"
                      placeholder="Click generate"
                      value={quizData.passcode}
                      onChange={(e) => setQuizData({ ...quizData, passcode: e.target.value })}
                      required
                    />
                    <Button type="button" variant="outline" onClick={generatePasscode}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-semibold">Questions</h2>
                <p className="text-sm text-muted-foreground">Add questions manually</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create with AI (Coming Soon)
                </Button>
              </div>
            </div>

            {questions.map((question, index) => (
              <Card key={question.id} className="border-0 shadow-soft">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg font-display">
                        Question {index + 1}
                      </CardTitle>
                      <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Select
                          value={question.time_limit.toString()}
                          onValueChange={(value) => updateQuestion(question.id, 'time_limit', parseInt(value))}
                        >
                          <SelectTrigger className="w-24 h-8 border-0 bg-transparent">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 sec</SelectItem>
                            <SelectItem value="15">15 sec</SelectItem>
                            <SelectItem value="20">20 sec</SelectItem>
                            <SelectItem value="30">30 sec</SelectItem>
                            <SelectItem value="45">45 sec</SelectItem>
                            <SelectItem value="60">60 sec</SelectItem>
                            <SelectItem value="90">90 sec</SelectItem>
                            <SelectItem value="120">2 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      className="text-destructive hover:text-destructive"
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      placeholder="Enter your question here..."
                      value={question.question_text}
                      onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[1, 2, 3, 4].map((optNum) => (
                      <div key={optNum} className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correct_option === optNum}
                            onChange={() => updateQuestion(question.id, 'correct_option', optNum)}
                            className="w-4 h-4 text-primary"
                          />
                          Option {optNum} {question.correct_option === optNum && '(Correct)'}
                        </Label>
                        <Input
                          placeholder={`Option ${optNum}`}
                          value={question[`option_${optNum}` as keyof Question] as string}
                          onChange={(e) => updateQuestion(question.id, `option_${optNum}` as keyof Question, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full border-dashed border-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" size="lg" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Creating...' : 'Create Quiz'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateQuiz;
