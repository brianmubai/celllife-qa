import React from 'react';
import { DEFAULT_BRANDING, SESSION_STATUS } from '../models/types.js';
import SponsorStrip from './SponsorStrip.jsx';

export default function SessionBanner({ session, compact = false }) {
  if (!session) return null;

  const { title, date, status, branding, sponsors } = session;
  const brand = branding || DEFAULT_BRANDING;

  const primaryColor = brand.primaryColor || DEFAULT_BRANDING.primaryColor;
  const accentColor = brand.accentColor || DEFAULT_BRANDING.accentColor;
  const emoji = brand.emoji || DEFAULT_BRANDING.emoji;
  const tagline = brand.tagline || '';
  const bannerUrl = brand.bannerUrl || null;

  // Formatted date string
  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        weekday: compact ? undefined : 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  // Background styling using CSS variables --primary and --accent
  const bannerStyle = {
    '--primary': primaryColor,
    '--accent': accentColor,
    background: bannerUrl
      ? `linear-gradient(135deg, rgba(220, 38, 38, 0.88) 0%, rgba(185, 28, 28, 0.92) 100%), url(${bannerUrl}) center/cover no-repeat`
      : `linear-gradient(135deg, var(--primary) 0%, #B91C1C 70%, #991B1B 100%)`,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  };

  // Status badge style helper
  const getStatusBadge = () => {
    switch (status) {
      case SESSION_STATUS.LIVE:
        return (
          <span className="session-status-badge badge-live">
            <span className="live-pulse-dot" /> LIVE NOW
          </span>
        );
      case SESSION_STATUS.ARCHIVED:
        return (
          <span className="session-status-badge badge-archived">
            📁 ARCHIVED
          </span>
        );
      case SESSION_STATUS.UPCOMING:
      default:
        return (
          <span className="session-status-badge badge-upcoming">
            ⏳ UPCOMING
          </span>
        );
    }
  };

  return (
    <div
      className={`session-banner ${compact ? 'session-banner-compact' : 'session-banner-full'}`}
      style={bannerStyle}
    >
      <div className="session-banner-top-row">
        <div className="session-banner-badge-group">
          <span className="session-banner-emoji" aria-label="Session Emoji">
            {emoji}
          </span>
          {getStatusBadge()}
        </div>
        {formattedDate && <span className="session-banner-date">{formattedDate}</span>}
      </div>

      <div className="session-banner-body">
        <h2 className="session-banner-title">{title || 'Untitled Session'}</h2>
        {tagline && <p className="session-banner-tagline">{tagline}</p>}
      </div>

      {!compact && sponsors && sponsors.length > 0 && (
        <div className="session-banner-sponsors-footer">
          <SponsorStrip sponsors={sponsors} />
        </div>
      )}
    </div>
  );
}

