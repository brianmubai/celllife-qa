import React, { useState } from 'react';

export default function SpeakerProfile({ speaker }) {
  const [imageError, setImageError] = useState(false);

  if (!speaker) return null;

  const { name, title, topic, bio, photoUrl } = speaker;

  // Initials fallback for avatar
  const initials = name
    ? name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <article className="speaker-card" id={`speaker-card-${speaker.id}`}>
      <div className="speaker-card-header">
        <div className="speaker-avatar-wrap">
          {photoUrl && !imageError ? (
            <img
              src={photoUrl}
              alt={name}
              className="speaker-avatar-img"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="speaker-avatar-placeholder" aria-label={`Avatar for ${name}`}>
              {initials}
            </div>
          )}
        </div>

        <div className="speaker-header-info">
          <h3 className="speaker-name">{name}</h3>
          {title && <p className="speaker-title">{title}</p>}
        </div>
      </div>

      <div className="speaker-topic-badge">
        <span className="topic-icon">🎯</span>
        <span className="topic-label">{topic}</span>
      </div>

      {bio && <p className="speaker-bio">{bio}</p>}
    </article>
  );
}
