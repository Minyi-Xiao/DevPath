import { Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { TopicLearningPage } from '../pages/TopicLearningPage';
import { TopicsPage } from '../pages/TopicsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/topics" element={<TopicsPage />} />
      <Route path="/topics/:topicSlug" element={<TopicLearningPage />} />
    </Routes>
  );
}
