export function PracticeSourceCardLabel({
  sourceCard,
}: {
  sourceCard: { number: number; title: string } | null | undefined;
}) {
  if (!sourceCard) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      From Card {sourceCard.number} · {sourceCard.title}
    </p>
  );
}
