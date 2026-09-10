import { Route, Routes } from 'react-router-dom';
import { AttemptResultPage } from '../pages/AttemptResultPage';
import { HomePage } from '../pages/HomePage';
import { PracticePage } from '../pages/PracticePage';
import { TopicLearningPage } from '../pages/TopicLearningPage';
import { TopicsPage } from '../pages/TopicsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/topics" element={<TopicsPage />} />
      <Route path="/topics/:topicSlug" element={<TopicLearningPage />} />
      <Route path="/topics/:topicSlug/practice" element={<PracticePage />} />
      <Route path="/attempts/:attemptId" element={<AttemptResultPage />} />
    </Routes>
  );
}
