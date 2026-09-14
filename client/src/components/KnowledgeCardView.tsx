import { formatKnowledgeCardLabel } from '../lib/knowledgeCardNumber';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

export function KnowledgeCardView({
  card,
}: {
  card: {
    number: number;
    title: string;
    content: string;
    codeExample: string | null;
    sourceLabel?: string | null;
  };
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-0 pb-3">
        <CardTitle className="text-lg leading-snug">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid flex-1 gap-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{card.content}</p>
        {card.codeExample ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{card.codeExample}</code>
          </pre>
        ) : null}
      </CardContent>
      <CardFooter className="gap-3 pt-4">
        {card.sourceLabel ? (
          <p className="min-w-0 truncate text-xs text-muted-foreground">{card.sourceLabel}</p>
        ) : null}
        <p className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatKnowledgeCardLabel(card.number)}
        </p>
      </CardFooter>
    </Card>
  );
}
