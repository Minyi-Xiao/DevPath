import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocumentErrorMessage } from '../api/documents';
import { getKnowledgeBaseErrorMessage } from '../api/knowledgeBase';
import { useDiscardDocument } from '../hooks/useDiscardDocument';
import { useKnowledgeBaseTopics } from '../hooks/useKnowledgeBaseTopics';
import { useSaveDocument } from '../hooks/useSaveDocument';
import type { KnowledgeDocument } from '../types/document';

const TOPIC_NAME_MAX_LENGTH = 80;

type SaveMode = 'new' | 'existing';

export function DocumentSaveSection({ document }: { document: KnowledgeDocument }) {
  const navigate = useNavigate();
  const saveMutation = useSaveDocument();
  const discardMutation = useDiscardDocument();
  const topicsQuery = useKnowledgeBaseTopics(true);
  const [mode, setMode] = useState<SaveMode>('new');
  const [topicName, setTopicName] = useState(document.suggestedTopicName ?? '');
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
        { documentId: document.id, newTopic: { name } },
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
    <section className="review-section save-section">
      <h2>Save to Knowledge Base</h2>
      <p className="upload-meta">Save these knowledge cards to a topic. Practice questions are generated when you start practice.</p>
      <article className="upload-card">
        <fieldset className="save-modes" disabled={isBusy}>
          <legend className="visually-hidden">Save destination</legend>
          <label>
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
          <label>
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
          <p className="state state-error">{getKnowledgeBaseErrorMessage(topicsQuery.error)}</p>
        ) : null}

        {mode === 'new' ? (
          <label className="save-field">
            Topic name
            <input
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
          </label>
        ) : null}

        {mode === 'existing' ? (
          <div className="save-field">
            {topicsQuery.isPending ? <p className="state">Loading topics...</p> : null}
            {!topicsQuery.isPending && !topicsQuery.isError && !hasTopics ? (
              <p className="state">You don't have any saved topics yet. Create a new topic for this document.</p>
            ) : null}
            {hasTopics ? (
              <label className="save-field">
                Select a topic
                <select
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
              </label>
            ) : null}
          </div>
        ) : null}

        {validationError ? <p className="state state-error">{validationError}</p> : null}
        {saveMutation.isError ? (
          <p className="state state-error">{getDocumentErrorMessage(saveMutation.error)}</p>
        ) : null}
        {discardMutation.isError ? (
          <p className="state state-error">{getDocumentErrorMessage(discardMutation.error)}</p>
        ) : null}

        <div className="save-actions">
          <button type="button" className="practice-start" disabled={isBusy} onClick={handleSave}>
            {saveMutation.isPending ? 'Saving...' : 'Save to Knowledge Base'}
          </button>
          <button type="button" className="discard-button" disabled={isBusy} onClick={handleDiscard}>
            {discardMutation.isPending ? 'Discarding...' : 'Discard'}
          </button>
        </div>
      </article>
    </section>
  );
}