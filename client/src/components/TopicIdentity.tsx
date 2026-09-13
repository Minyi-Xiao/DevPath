import { CircleAlert, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getUpdateTopicErrorMessage } from '../api/knowledgeBase';
import { useUpdateTopic } from '../hooks/useUpdateTopic';
import { TOPIC_DESCRIPTION_MAX_LENGTH, TOPIC_NAME_MAX_LENGTH } from '../lib/topicLimits';
import type { KnowledgeBaseTopicDetailResponse } from '../types/knowledgeBase';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const textareaClassName =
  'flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function TopicIdentity({ topic }: { topic: KnowledgeBaseTopicDetailResponse['topic'] }) {
  const updateMutation = useUpdateTopic(topic.slug);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description);
  const [validationError, setValidationError] = useState<string | null>(null);

  function startEditing() {
    setName(topic.name);
    setDescription(topic.description);
    setValidationError(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (updateMutation.isPending) {
      return;
    }

    setName(topic.name);
    setDescription(topic.description);
    setValidationError(null);
    setEditing(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (updateMutation.isPending) {
      return;
    }

    const nextName = name.trim();

    if (!nextName) {
      setValidationError('Please enter a topic name.');
      return;
    }

    if (nextName.length > TOPIC_NAME_MAX_LENGTH) {
      setValidationError('Topic name must be 80 characters or fewer.');
      return;
    }

    updateMutation.mutate(
      { name: nextName, description: description.trim() },
      {
        onSuccess: () => {
          setEditing(false);
          setValidationError(null);
        },
      },
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={startEditing}>
            <Pencil />
            <span className="sr-only">Edit topic</span>
          </Button>
        </div>
        {topic.description.trim() ? (
          <p className="text-muted-foreground">{topic.description}</p>
        ) : (
          <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={startEditing}>
            Add a description
          </Button>
        )}
      </div>
    );
  }

  return (
    <form className="grid max-w-xl gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="topic-name">Topic name</Label>
        <Input
          id="topic-name"
          name="topicName"
          value={name}
          maxLength={TOPIC_NAME_MAX_LENGTH}
          disabled={updateMutation.isPending}
          onChange={(event) => {
            setValidationError(null);
            setName(event.target.value);
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="topic-description">Description</Label>
        <textarea
          id="topic-description"
          name="topicDescription"
          className={textareaClassName}
          value={description}
          maxLength={TOPIC_DESCRIPTION_MAX_LENGTH}
          disabled={updateMutation.isPending}
          onChange={(event) => {
            setValidationError(null);
            setDescription(event.target.value);
          }}
        />
      </div>
      {validationError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      ) : null}
      {updateMutation.isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{getUpdateTopicErrorMessage(updateMutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={cancelEditing}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
