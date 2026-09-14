import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getTopicPracticePath } from '../lib/practicePaths';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

type PracticeAgainDialogProps = {
  topicSlug: string;
  attemptId: string;
  children: ReactNode;
};

export function PracticeAgainDialog({ topicSlug, attemptId, children }: PracticeAgainDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Practice again</DialogTitle>
          <DialogDescription>How do you want to practice again?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Link
            to={getTopicPracticePath(topicSlug, { fromAttempt: attemptId })}
            className="rounded-xl border bg-card px-4 py-4 text-left shadow transition-colors hover:bg-accent/40"
          >
            <span className="block font-medium">Retry these questions</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Practice the same questions from this attempt again.
            </span>
          </Link>
          <Link
            to={getTopicPracticePath(topicSlug)}
            className="rounded-xl border bg-card px-4 py-4 text-left shadow transition-colors hover:bg-accent/40"
          >
            <span className="block font-medium">Generate new questions</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Create a new set from your knowledge cards.
            </span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
