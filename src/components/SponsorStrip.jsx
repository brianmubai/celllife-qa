import React from 'react';
import { SPONSOR_TIER } from '../models/types.js';

export default function SponsorStrip({ sponsors = [] }) {
  if (!sponsors || sponsors.length === 0) {
    return null;
  }

  // Group sponsors by tier
  const titleSponsors = sponsors.filter((s) => s.tier === SPONSOR_TIER.TITLE);
  const goldSponsors = sponsors.filter((s) => s.tier === SPONSOR_TIER.GOLD);
  const supportingSponsors = sponsors.filter(
    (s) => s.tier === SPONSOR_TIER.SUPPORTING || !s.tier
  );

  const renderSponsorItem = (sponsor, isTitle = false) => {
    const content = (
      <div
        className={`sponsor-badge-item ${isTitle ? 'sponsor-item-title' : 'sponsor-item-standard'}`}
        title={sponsor.blurb ? `${sponsor.name} — ${sponsor.blurb}` : sponsor.name}
      >
        {sponsor.logoUrl ? (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            className={`sponsor-logo-img ${isTitle ? 'logo-large' : 'logo-standard'}`}
          />
        ) : (
          <span className="sponsor-name-fallback">{sponsor.name}</span>
        )}
      </div>
    );

    if (sponsor.websiteUrl) {
      return (
        <a
          key={sponsor.id}
          href={sponsor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sponsor-link-wrap"
          aria-label={`Visit ${sponsor.name}`}
          id={`sponsor-link-${sponsor.id}`}
        >
          {content}
        </a>
      );
    }

    return (
      <div key={sponsor.id} className="sponsor-link-wrap" id={`sponsor-badge-${sponsor.id}`}>
        {content}
      </div>
    );
  };

  return (
    <div className="sponsor-strip-container" id="session-sponsor-strip">
      <div className="sponsor-strip-heading">
        <span className="sponsor-kicker">Session Sponsors & Partners</span>
      </div>

      <div className="sponsor-tiers-layout">
        {/* Title Sponsors Tier (Larger) */}
        {titleSponsors.length > 0 && (
          <div className="sponsor-tier-group tier-title-group" id="tier-title-sponsors">
            <span className="tier-label">Title Sponsor</span>
            <div className="sponsor-items-row title-row">
              {titleSponsors.map((s) => renderSponsorItem(s, true))}
            </div>
          </div>
        )}

        {/* Gold Sponsors Tier */}
        {goldSponsors.length > 0 && (
          <div className="sponsor-tier-group tier-gold-group" id="tier-gold-sponsors">
            <span className="tier-label">Gold Sponsors</span>
            <div className="sponsor-items-row">
              {goldSponsors.map((s) => renderSponsorItem(s, false))}
            </div>
          </div>
        )}

        {/* Supporting Sponsors Tier */}
        {supportingSponsors.length > 0 && (
          <div className="sponsor-tier-group tier-supporting-group" id="tier-supporting-sponsors">
            <span className="tier-label">Supporting Partners</span>
            <div className="sponsor-items-row">
              {supportingSponsors.map((s) => renderSponsorItem(s, false))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
