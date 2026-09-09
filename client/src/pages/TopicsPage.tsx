import { useTopics } from '../hooks/useTopics';

export function TopicsPage() {
  const { data: topics, isPending, isError } = useTopics();

  return (
    <main className="page page-topics">
      <section className="topics">
        <h1>Developer Topics</h1>
        <p className="tagline">Choose a topic to start learning.</p>

        {isPending ? <p className="state">Loading topics...</p> : null}
        {isError ? <p className="state state-error">Could not load topics. Please try again.</p> : null}

        {topics ? (
          <ul className="topic-grid">
            {topics.map((topic) => (
              <li key={topic.id} className="topic-card">
                <h2>{topic.name}</h2>
                <p>{topic.description}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
