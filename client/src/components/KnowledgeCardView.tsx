import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function KnowledgeCardView({
  card,
}: {
  card: {
    title: string;
    content: string;
    codeExample: string | null;
    sourceLabel?: string | null;
  };
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        {card.sourceLabel ? <p className="text-xs text-muted-foreground">{card.sourceLabel}</p> : null}
        <CardTitle className="text-lg">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="whitespace-pre-wrap text-sm">{card.content}</p>
        {card.codeExample ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{card.codeExample}</code>
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
