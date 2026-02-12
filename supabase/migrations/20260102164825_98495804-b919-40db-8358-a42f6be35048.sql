-- Add status field to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN status TEXT NOT NULL DEFAULT 'created';

-- Add constraint for status values using a trigger instead of CHECK (more flexible)
CREATE OR REPLACE FUNCTION public.validate_quiz_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('created', 'live', 'conducted') THEN
    RAISE EXCEPTION 'Invalid status value. Must be: created, live, or conducted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_quiz_status_trigger
BEFORE INSERT OR UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.validate_quiz_status();

-- Add live session code (for joining via QR/code)
ALTER TABLE public.quizzes 
ADD COLUMN live_code TEXT UNIQUE;

-- Add session start time
ALTER TABLE public.quizzes 
ADD COLUMN session_started_at TIMESTAMPTZ;

-- Create quiz_sessions table for virtual room tracking
CREATE TABLE public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quiz_id, student_id)
);

-- Enable RLS on quiz_sessions
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_sessions
CREATE POLICY "Faculty can view sessions for their quizzes"
ON public.quiz_sessions
FOR SELECT
USING (
  quiz_id IN (
    SELECT q.id FROM public.quizzes q
    JOIN public.profiles p ON q.faculty_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Students can join sessions"
ON public.quiz_sessions
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own sessions"
ON public.quiz_sessions
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Students can leave sessions"
ON public.quiz_sessions
FOR DELETE
USING (
  student_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Enable realtime for quiz_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;

-- Update quizzes table for realtime (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quizzes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
  END IF;
END $$;