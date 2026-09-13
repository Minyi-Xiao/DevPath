export function KnowledgeCardView({
  card,
}: {
  card: {
    title: string;
    content: string;
    codeExample: string | null;
  };
}) {
  return (
    <article className="learning-card">
      <h3>{card.title}</h3>
      <p className="learning-content">{card.content}</p>
      {card.codeExample ? (
        <pre className="learning-code">
          <code>{card.codeExample}</code>
        </pre>
      ) : null}
    </article>
  );
}