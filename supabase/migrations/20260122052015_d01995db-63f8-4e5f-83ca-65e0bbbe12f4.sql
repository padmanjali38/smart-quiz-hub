-- Add time_limit column to questions table for per-question timer (in seconds)
ALTER TABLE public.questions 
ADD COLUMN time_limit INTEGER NOT NULL DEFAULT 30;