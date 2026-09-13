import { CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentErrorMessage } from '../api/documents';
import { getKnowledgeBaseErrorMessage } from '../api/knowledgeBase';
import { useDiscardDocument } from '../hooks/useDiscardDocument';
import { useKnowledgeBaseTopics } from '../hooks/useKnowledgeBaseTopics';
import { useSaveDocument } from '../hooks/useSaveDocument';
import { TOPIC_DESCRIPTION_MAX_LENGTH, TOPIC_NAME_MAX_LENGTH } from '../lib/topicLimits';
import type { KnowledgeDocument } from '../types/document';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type SaveMode = 'new' | 'existing';

export function DocumentSaveSection({ document }: { document: KnowledgeDocument }) {
  const navigate = useNavigate();
  const saveMutation = useSaveDocument();
  const discardMutation = useDiscardDocument();
  const topicsQuery = useKnowledgeBaseTopics(true);
  const [mode, setMode] = useState<SaveMode>('new');
  const [topicName, setTopicName] = useState(document.suggestedTopicName ?? '');
  const [topicDescription, setTopicDescription] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const topics = topicsQuery.data ?? [];
  const hasTopics = topics.length > 0;
  const isBusy = saveMutation.isPending || discardMutation.isPending;

  useEffect(() => {
    if (!topicsQuery.isPending && !topicsQuery.isError && !hasTopics && mode === 'existing') {
      setMode('new');
    }
  }, [hasTopics, mode, topicsQuery.isPending]);

  function handleSave() {
    if (isBusy) {
      return;
    }

    setValidationError(null);

    if (mode === 'new') {
      const name = topicName.trim();

      if (!name) {
        setValidationError('Please enter a topic name.');
        return;
      }

      if (name.length > TOPIC_NAME_MAX_LENGTH) {
        setValidationError('Topic name must be 80 characters or fewer.');
        return;
      }

      saveMutation.mutate(
        { documentId: document.id, newTopic: { name, description: topicDescription.trim() } },
        {
          onSuccess: () => {
            navigate('/knowledge-base', { state: { message: 'Knowledge saved successfully.' } });
          },
        },
      );
      return;
    }

    if (!selectedTopicId) {
      setValidationError('Please select a topic.');
      return;
    }

    saveMutation.mutate(
      { documentId: document.id, topicId: selectedTopicId },
      {
        onSuccess: () => {
          navigate('/knowledge-base', { state: { message: 'Knowledge saved successfully.' } });
        },
      },
    );
  }

  function handleDiscard() {
    if (isBusy) {
      return;
    }

    const confirmed = window.confirm(
      'Discard this document? The uploaded file and generated knowledge will be removed.',
    );

    if (!confirmed) {
      return;
    }

    setValidationError(null);
    discardMutation.mutate(document.id, {
      onSuccess: () => {
        navigate('/new-knowledge');
      },
    });
  }

  return (
    <section className="grid gap-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Save to Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Save these knowledge cards to a topic. Practice questions are generated when you start practice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Save destination</CardTitle>
          <CardDescription>Create a new topic or add this document to one you already have.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <fieldset className="grid gap-3" disabled={isBusy}>
            <legend className="sr-only">Save destination</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="save-mode"
                value="new"
                checked={mode === 'new'}
                onChange={() => {
                  setValidationError(null);
                  setMode('new');
                }}
              />
              Create a new Topic
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="save-mode"
                value="existing"
                checked={mode === 'existing'}
                disabled={!hasTopics && !topicsQuery.isPending && !topicsQuery.isError}
                onChange={() => {
                  setValidationError(null);
                  setMode('existing');
                }}
              />
              Add to an existing Topic
            </label>
          </fieldset>

          {topicsQuery.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getKnowledgeBaseErrorMessage(topicsQuery.error)}</AlertDescription>
            </Alert>
          ) : null}

          {mode === 'new' ? (
            <div className="grid max-w-md gap-4">
              <div className="grid gap-2">
                <Label htmlFor="topic-name">Topic name</Label>
                <Input
                  id="topic-name"
                  type="text"
                  name="topicName"
                  value={topicName}
                  maxLength={TOPIC_NAME_MAX_LENGTH}
                  disabled={isBusy}
                  onChange={(event) => {
                    setValidationError(null);
                    setTopicName(event.target.value);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="topic-description">Description (optional)</Label>
                <textarea
                  id="topic-description"
                  name="topicDescription"
                  className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={topicDescription}
                  maxLength={TOPIC_DESCRIPTION_MAX_LENGTH}
                  disabled={isBusy}
                  onChange={(event) => {
                    setValidationError(null);
                    setTopicDescription(event.target.value);
                  }}
                />
              </div>
            </div>
          ) : null}

          {mode === 'existing' ? (
            <div className="grid max-w-md gap-2">
              {topicsQuery.isPending ? <p className="text-sm text-muted-foreground">Loading topics...</p> : null}
              {!topicsQuery.isPending && !topicsQuery.isError && !hasTopics ? (
                <p className="text-sm text-muted-foreground">
                  You don't have any saved topics yet. Create a new topic for this document.
                </p>
              ) : null}
              {hasTopics ? (
                <>
                  <Label htmlFor="topic-select">Select a topic</Label>
                  <select
                    id="topic-select"
                    className={selectClassName}
                    value={selectedTopicId}
                    disabled={isBusy}
                    onChange={(event) => {
                      setValidationError(null);
                      setSelectedTopicId(event.target.value);
                    }}
                  >
                    <option value="">Select a topic</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          ) : null}

          {validationError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          ) : null}
          {saveMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getDocumentErrorMessage(saveMutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          {discardMutation.isError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{getDocumentErrorMessage(discardMutation.error)}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={isBusy} onClick={handleSave}>
              {saveMutation.isPending ? 'Saving...' : 'Save to Knowledge Base'}
            </Button>
            <Button type="button" variant="outline" disabled={isBusy} onClick={handleDiscard}>
              {discardMutation.isPending ? 'Discarding...' : 'Discard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
