import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="page page-topics">
      <section className="topics">
        <h1>Build your developer knowledge</h1>
        <p className="tagline">Turn learning materials into structured knowledge with AI.</p>

        <ul className="topic-grid">
          <li>
            <Link to="/new-knowledge" className="topic-card">
              <h2>New Knowledge</h2>
              <p>Upload a learning document and turn it into structured knowledge with AI.</p>
            </Link>
          </li>
          <li>
            <Link to="/knowledge-base" className="topic-card">
              <h2>Knowledge Base</h2>
              <p>Browse your saved topics, knowledge cards, and source documents.</p>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}