-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('faculty', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  num_questions INTEGER NOT NULL DEFAULT 0,
  quiz_date DATE NOT NULL,
  quiz_time TIME NOT NULL,
  quiz_id TEXT NOT NULL UNIQUE,
  passcode TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_1 TEXT NOT NULL,
  option_2 TEXT NOT NULL,
  option_3 TEXT NOT NULL,
  option_4 TEXT NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option >= 1 AND correct_option <= 4),
  question_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(quiz_id, student_id)
);

-- Create student answers table
CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option INTEGER CHECK (selected_option >= 1 AND selected_option <= 4),
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Faculty can manage their own quizzes"
  ON public.quizzes FOR ALL
  USING (faculty_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view active quizzes"
  ON public.quizzes FOR SELECT
  USING (is_active = true);

-- Questions policies
CREATE POLICY "Faculty can manage questions for their quizzes"
  ON public.questions FOR ALL
  USING (quiz_id IN (
    SELECT q.id FROM public.quizzes q
    JOIN public.profiles p ON q.faculty_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Students can view questions for active quizzes"
  ON public.questions FOR SELECT
  USING (quiz_id IN (SELECT id FROM public.quizzes WHERE is_active = true));

-- Quiz attempts policies
CREATE POLICY "Students can manage their own attempts"
  ON public.quiz_attempts FOR ALL
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Faculty can view attempts for their quizzes"
  ON public.quiz_attempts FOR SELECT
  USING (quiz_id IN (
    SELECT q.id FROM public.quizzes q
    JOIN public.profiles p ON q.faculty_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Student answers policies
CREATE POLICY "Students can manage their own answers"
  ON public.student_answers FOR ALL
  USING (attempt_id IN (
    SELECT a.id FROM public.quiz_attempts a
    JOIN public.profiles p ON a.student_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Faculty can view answers for their quizzes"
  ON public.student_answers FOR SELECT
  USING (attempt_id IN (
    SELECT a.id FROM public.quiz_attempts a
    JOIN public.quizzes q ON a.quiz_id = q.id
    JOIN public.profiles p ON q.faculty_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();