import { Route, Routes } from 'react-router-dom';
import { AttemptResultPage } from '../pages/AttemptResultPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { PracticePage } from '../pages/PracticePage';
import { RegisterPage } from '../pages/RegisterPage';
import { TopicLearningPage } from '../pages/TopicLearningPage';
import { TopicsPage } from '../pages/TopicsPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/topics/:topicSlug" element={<TopicLearningPage />} />
        <Route
          path="/topics/:topicSlug/practice"
          element={
            <ProtectedRoute>
              <PracticePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attempts/:attemptId"
          element={
            <ProtectedRoute>
              <AttemptResultPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
