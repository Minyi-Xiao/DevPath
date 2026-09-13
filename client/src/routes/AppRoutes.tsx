import { Route, Routes } from 'react-router-dom';
import { AttemptResultPage } from '../pages/AttemptResultPage';
import { HomePage } from '../pages/HomePage';
import { DocumentReviewPage } from '../pages/DocumentReviewPage';
import { KnowledgeBasePage } from '../pages/KnowledgeBasePage';
import { KnowledgeBaseTopicPage } from '../pages/KnowledgeBaseTopicPage';
import { LoginPage } from '../pages/LoginPage';
import { NewKnowledgePage } from '../pages/NewKnowledgePage';
import { PracticeHistoryPage } from '../pages/PracticeHistoryPage';
import { PracticePage } from '../pages/PracticePage';
import { RegisterPage } from '../pages/RegisterPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/new-knowledge"
          element={
            <ProtectedRoute>
              <NewKnowledgePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-knowledge/:documentId/review"
          element={
            <ProtectedRoute>
              <DocumentReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge-base"
          element={
            <ProtectedRoute>
              <KnowledgeBasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge-base/topics/:slug"
          element={
            <ProtectedRoute>
              <KnowledgeBaseTopicPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge-base/topics/:topicSlug/practice"
          element={
            <ProtectedRoute>
              <PracticePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <PracticeHistoryPage />
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
