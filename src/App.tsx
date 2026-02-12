import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateQuiz from "./pages/CreateQuiz";
import Performance from "./pages/Performance";
import AttemptQuiz from "./pages/AttemptQuiz";
import MyQuizzes from "./pages/MyQuizzes";
import QuizDetails from "./pages/QuizDetails";
import ConductQuiz from "./pages/ConductQuiz";
import QuizRoom from "./pages/QuizRoom";
import MyProgress from "./pages/MyProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-quiz" element={<CreateQuiz />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/attempt-quiz" element={<AttemptQuiz />} />
            <Route path="/my-quizzes" element={<MyQuizzes />} />
            <Route path="/quiz/:id" element={<QuizDetails />} />
            <Route path="/conduct-quiz/:id" element={<ConductQuiz />} />
            <Route path="/quiz-room" element={<QuizRoom />} />
            <Route path="/quiz-room/:code" element={<QuizRoom />} />
            <Route path="/my-progress" element={<MyProgress />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
