'use client';

import React, { useState } from 'react';

type Props = {
  message: string;
  onMessageChange: (message: string) => void;
  onNext: () => void;
  onBack: () => void;
  creatorId?: string;
  creatorSlug?: string;
  supabase?: any;
};

export default function PromptAnswers({ message, onMessageChange, onNext, onBack, creatorId, creatorSlug, supabase }: Props) {
  const [charCount, setCharCount] = useState(message.length);
  const [creatorFirstName, setCreatorFirstName] = useState<string>('');
  const maxChars = 500;

  // Fetch creator's first name
  React.useEffect(() => {
    const fetchCreatorName = async () => {
      if (!supabase || (!creatorId && !creatorSlug)) return;

      try {
        let query = supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('is_reviewer', 'approved'); // Only show approved reviewers

        if (creatorId) {
          query = query.eq('id', creatorId);
        } else if (creatorSlug) {
          query = query.eq('username', creatorSlug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data?.first_name) {
          setCreatorFirstName(data.first_name);
        }
      } catch (error) {
        console.error('Error fetching creator name:', error);
      }
    };

    fetchCreatorName();
  }, [creatorId, creatorSlug, supabase]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    if (newMessage.length <= maxChars) {
      onMessageChange(newMessage);
      setCharCount(newMessage.length);
    }
  };

  const canProceed = message.trim().length >= 10;

  return (
    <div className="prompt-answers">
      <div className="step-header">
        <h2>Tell {creatorFirstName || 'Your Reviewer'} About Yourself</h2>
        <p>Leave a note for your reviewer about what you want to focus on, what you think your issues are, etc.</p>
      </div>

      <div className="prompt-section">
        <div className="message-input-container">
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Hi! I'm looking for honest feedback on my overall attractiveness and style. I'm particularly interested in improving my wardrobe for dating. Any specific advice on what works and what doesn't would be incredibly helpful. Thanks!"
            className="message-textarea"
            rows={8}
          />
          <div className="char-counter">
            <span className={charCount > maxChars * 0.9 ? 'warning' : ''}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button 
          type="button" 
          onClick={onNext} 
          className="btn-primary"
          disabled={!canProceed}
        >
          Continue
        </button>
      </div>

      {!canProceed && message.trim().length < 10 && (
        <p className="validation-message">
          Please write at least 10 characters to help your reviewer understand what you're looking for.
        </p>
      )}
    </div>
  );
}
