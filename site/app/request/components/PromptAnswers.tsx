'use client';

import React, { useState } from 'react';

type Props = {
  message: string;
  onMessageChange: (message: string) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function PromptAnswers({ message, onMessageChange, onNext, onBack }: Props) {
  const [charCount, setCharCount] = useState(message.length);
  const maxChars = 500;

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    if (newMessage.length <= maxChars) {
      onMessageChange(newMessage);
      setCharCount(newMessage.length);
    }
  };

  const canProceed = message.trim().length >= 10;

  const prompts = [
    "What specific areas would you like feedback on?",
    "What's your dating goal? (e.g., serious relationship, casual dating, etc.)",
    "What do you think your strongest feature is?",
    "What area do you think needs the most improvement?",
    "Any specific style preferences or inspirations?",
    "What's your age range and who are you trying to attract?"
  ];

  const addPromptToMessage = (prompt: string) => {
    const currentMessage = message.trim();
    const newLine = currentMessage ? '\n\n' : '';
    const newMessage = currentMessage + newLine + prompt + ' ';
    
    if (newMessage.length <= maxChars) {
      onMessageChange(newMessage);
      setCharCount(newMessage.length);
    }
  };

  return (
    <div className="prompt-answers">
      <div className="step-header">
        <h2>Tell Us About Yourself</h2>
        <p>Help your reviewer provide better feedback by sharing more about yourself and what you're looking for.</p>
      </div>

      <div className="prompt-section">
        <h3>Message to Your Reviewer</h3>
        <p className="prompt-description">
          Write a message describing what you'd like feedback on. Be specific about your goals and areas of focus.
        </p>

        <div className="message-input-container">
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Hi! I'm looking for honest feedback on my overall attractiveness and style. I'm particularly interested in improving my wardrobe for dating. I'd also love feedback on my room setup as I often bring dates over. Any specific advice on what works and what doesn't would be incredibly helpful. Thanks!"
            className="message-textarea"
            rows={8}
          />
          <div className="char-counter">
            <span className={charCount > maxChars * 0.9 ? 'warning' : ''}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>

        <div className="prompt-suggestions">
          <h4>Need inspiration? Click to add these questions:</h4>
          <div className="prompt-buttons">
            {prompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                className="prompt-button"
                onClick={() => addPromptToMessage(prompt)}
                disabled={message.length + prompt.length + 2 > maxChars}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="tips">
          <h4>💡 Tips for better feedback:</h4>
          <ul>
            <li>Be specific about what you want to improve</li>
            <li>Mention your dating goals and target audience</li>
            <li>Ask about specific areas like wardrobe, grooming, or room setup</li>
            <li>Be open to honest feedback - it will help you improve</li>
          </ul>
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
