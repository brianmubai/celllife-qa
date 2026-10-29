import React, { useState, useEffect } from 'react';
import { API_BASE } from './config.js';
import SpeakerProfile from './components/SpeakerProfile.jsx';
import SpeakerAdmin from './components/SpeakerAdmin.jsx';
import SessionList from './components/SessionList.jsx';
import LiveSessionScreen from './components/LiveSessionScreen.jsx';
import SessionArchive from './components/SessionArchive.jsx';
import ArchiveSearch from './components/ArchiveSearch.jsx';
import SponsorAdmin from './components/SponsorAdmin.jsx';
import SessionCloseOutAdmin from './components/SessionCloseOutAdmin.jsx';
import RoleAccessModal from './components/RoleAccessModal.jsx';
import SponsorStrip from './components/SponsorStrip.jsx';
import ParticipantQRModal from './components/ParticipantQRModal.jsx';

function App() {
  // Role State: 'participant' (default) | 'speaker' | 'admin'
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('celllife_role') || 'participant';
  });
  const [activeSpeaker, setActiveSpeaker] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('celllife_speaker') || 'null');
    } catch {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState(() => {
    return sessionStorage.getItem('celllife_admin_token') || '';
  });
  const [speakerPin, setSpeakerPin] = useState(() => {
    return sessionStorage.getItem('celllife_speaker_pin') || '';
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalTab, setRoleModalTab] = useState('speaker');
  const [showQrModal, setShowQrModal] = useState(false);

  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'speakers' | 'sponsors' | 'archive' | 'closeout'
  const [selectedArchiveSessionId, setSelectedArchiveSessionId] = useState(null);
  const [liveSessionId, setLiveSessionId] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [sponsorsList, setSponsorsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin Data Reset Handler
  const handleResetAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to clear ALL previous sessions, questions, and speakers?\n\nThis will wipe all existing conference data so you can create a completely fresh session.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/reset-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || sessionStorage.getItem('celllife_admin_token') || 'admin123',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear data');
      alert('✓ ' + data.message);
      window.location.reload();
    } catch (err) {
      alert(`Error resetting data: ${err.message}`);
    }
  };

  // Role login / logout handlers
  const handleLoginAsSpeaker = (speakerObj, pin = '') => {
    setUserRole('speaker');
    setActiveSpeaker(speakerObj);
    if (pin) {
      setSpeakerPin(pin);
      sessionStorage.setItem('celllife_speaker_pin', pin);
    }
    sessionStorage.setItem('celllife_role', 'speaker');
    sessionStorage.setItem('celllife_speaker', JSON.stringify(speakerObj));
    setActiveTab('sessions');
  };

  const handleLoginAsAdmin = (token) => {
    setUserRole('admin');
    setAdminToken(token);
    sessionStorage.setItem('celllife_role', 'admin');
    sessionStorage.setItem('celllife_admin_token', token);
    localStorage.setItem('qa_admin_token', token);
    setActiveTab('sessions');
  };

  const handleLogoutRole = () => {
    setUserRole('participant');
    setActiveSpeaker(null);
    setSpeakerPin('');
    setAdminToken('');
    sessionStorage.removeItem('celllife_role');
    sessionStorage.removeItem('celllife_speaker');
    sessionStorage.removeItem('celllife_speaker_pin');
    sessionStorage.removeItem('celllife_admin_token');
    setActiveTab('sessions');
  };

  // Handle routing for /session/:id/live, /admin, /speaker, and meaningful /qa, /ask
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const match =
        path.match(/^\/session\/([^/]+)\/live\/?$/) ||
        hash.match(/^#\/session\/([^/]+)\/live\/?$/);

      if (match) {
        setLiveSessionId(match[1]);
        return;
      } else {
        setLiveSessionId(null);
      }

      // Meaningful Q&A routes: /qa, /ask, /questions
      if (
        path === '/qa' ||
        path === '/ask' ||
        path === '/questions' ||
        hash === '#/qa' ||
        hash === '#/ask' ||
        hash === '#/questions'
      ) {
        setUserRole('participant');
        setActiveTab('sessions');
      }

      if (path === '/admin' || hash === '#/admin') {
        if (userRole !== 'admin') {
          setRoleModalTab('admin');
          setShowRoleModal(true);
        }
      } else if (path === '/speaker' || hash === '#/speaker') {
        if (userRole !== 'speaker') {
          setRoleModalTab('speaker');
          setShowRoleModal(true);
        }
      }
    };

    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    checkRoute();

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, [userRole]);

  // Fetch public speakers list
  const fetchSpeakers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/speakers`);
      if (!res.ok) {
        throw new Error(`Failed to load speakers (${res.status})`);
      }
      const data = await res.json();
      setSpeakers(data);
    } catch (err) {
      setError(err.message || 'Error fetching speakers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch public sponsors list
  const fetchSponsors = async () => {
    try {
      const res = await fetch(`${API_BASE}/sponsors`);
      if (res.ok) {
        const data = await res.json();
        setSponsorsList(data);
      }
    } catch (err) {
      console.error('Error fetching sponsors:', err);
    }
  };

  useEffect(() => {
    fetchSpeakers();
    fetchSponsors();
  }, []);

  // If on /session/:id/live route, render dedicated projector screen
  if (liveSessionId) {
    return (
      <LiveSessionScreen
        sessionId={liveSessionId}
        onExit={() => {
          window.history.pushState({}, '', '/');
          setLiveSessionId(null);
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <img
              src="/celllife-logo.png"
              alt="cellLife Logo"
              className="brand-logo-img"
            />
            <div className="brand-text">
              <h1>cell<span className="brand-highlight">Life</span></h1>
              <span className="brand-tagline">it’s a lifestyle... · Live Q&A</span>
            </div>
          </div>

          <div className="nav-actions">
            {/* Primary Navigation Tabs - Filtered strictly by role */}
            <nav className="tabs-navigation" aria-label="Main Navigation">
              {/* Sessions Tab: Visible to everyone */}
              <button
                type="button"
                id="tab-sessions-btn"
                className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                📅 Sessions
              </button>

              {/* Speakers Tab: Public list for participants, Admin panel for admin */}
              {userRole !== 'speaker' && (
                <button
                  type="button"
                  id="tab-speakers-btn"
                  className={`tab-btn ${activeTab === 'speakers' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('speakers');
                    fetchSpeakers();
                  }}
                >
                  🎙️ {userRole === 'admin' ? 'Speakers Admin' : 'Speakers'}
                </button>
              )}

              {/* Sponsors Tab: Public strip for participants, Admin manager for admin */}
              {userRole !== 'speaker' && (
                <button
                  type="button"
                  id="tab-sponsors-btn"
                  className={`tab-btn ${activeTab === 'sponsors' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sponsors')}
                >
                  🏢 {userRole === 'admin' ? 'Sponsors Admin' : 'Sponsors'}
                </button>
              )}

              {/* Archive Tab: Visible to everyone */}
              <button
                type="button"
                id="tab-archive-btn"
                className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('archive');
                  setSelectedArchiveSessionId(null);
                }}
              >
                📁 Archive
              </button>

              {/* Close-Out Tab: Administrator Only */}
              {userRole === 'admin' && (
                <button
                  type="button"
                  id="tab-closeout-btn"
                  className={`tab-btn ${activeTab === 'closeout' ? 'active' : ''}`}
                  onClick={() => setActiveTab('closeout')}
                >
                  📊 Close-Out
                </button>
              )}
            </nav>

            {/* Quick QR Code for Audience */}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowQrModal(true)}
              id="header-qr-code-btn"
              style={{
                background: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Show QR Code for audience to scan and join Q&A"
            >
              📱 Scan to Ask (QR)
            </button>

            {/* Role Badges or Staff Portal Access Button */}
            {userRole === 'participant' && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="staff-portal-btn"
                  onClick={() => {
                    setRoleModalTab('speaker');
                    setShowRoleModal(true);
                  }}
                  title="Speaker Access Portal"
                  id="speaker-portal-trigger-btn"
                >
                  🎙️ Speaker Login
                </button>
                <button
                  type="button"
                  className="staff-portal-btn"
                  onClick={() => {
                    setRoleModalTab('admin');
                    setShowRoleModal(true);
                  }}
                  title="Admin Suite: Manage Sessions, Speakers, and Event"
                  id="admin-portal-trigger-btn"
                  style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    borderColor: '#38bdf8',
                    color: '#38bdf8',
                  }}
                >
                  🛡️ Admin Login
                </button>
              </div>
            )}

            {userRole === 'speaker' && (
              <div className="role-active-badge">
                <span>🎙️ <strong>{activeSpeaker?.name || 'Speaker'}</strong></span>
                <button
                  type="button"
                  className="btn-exit-role"
                  onClick={handleLogoutRole}
                  title="Switch back to regular participant view"
                >
                  Exit
                </button>
              </div>
            )}

            {userRole === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleResetAllData}
                  id="header-clear-data-btn"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Clear all data to start a new conference session"
                >
                  🗑️ Clear All Data
                </button>
                <div className="role-active-badge admin-badge">
                  <span>🛡️ <strong>Admin</strong></span>
                  <button
                    type="button"
                    className="btn-exit-role"
                    onClick={handleLogoutRole}
                    title="Switch back to regular participant view"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <section id="sessions-section">
            <SessionList
              userRole={userRole}
              activeSpeaker={activeSpeaker}
              speakerPin={speakerPin}
              adminToken={adminToken}
              onOpenLiveScreen={(sessionId) => {
                window.history.pushState({}, '', `/session/${sessionId}/live`);
                setLiveSessionId(sessionId);
              }}
              onOpenArchive={(sessionId) => {
                setSelectedArchiveSessionId(sessionId);
                setActiveTab('archive');
              }}
            />
          </section>
        )}

        {/* Speakers Tab */}
        {activeTab === 'speakers' && (
          <section id="speakers-section">
            {userRole === 'admin' ? (
              <SpeakerAdmin
                adminToken={adminToken}
                onSpeakerUpdated={() => {
                  fetchSpeakers();
                }}
              />
            ) : (
              <div>
                <div className="section-intro">
                  <div>
                    <h2 className="section-title">Featured Speakers</h2>
                    <p className="section-desc">
                      Explore session experts, their specialties, and presentation topics.
                    </p>
                  </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                  <div className="empty-state">
                    <p>Loading speakers...</p>
                  </div>
                ) : speakers.length === 0 ? (
                  <div className="empty-state">
                    <p>No speaker profiles published yet.</p>
                  </div>
                ) : (
                  <div className="speakers-grid">
                    {speakers.map((speaker) => (
                      <SpeakerProfile key={speaker.id} speaker={speaker} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Sponsors Tab */}
        {activeTab === 'sponsors' && (
          <section id="sponsors-section">
            {userRole === 'admin' ? (
              <SponsorAdmin onSponsorUpdated={fetchSponsors} />
            ) : (
              <div>
                <div className="section-intro">
                  <div>
                    <h2 className="section-title">Event Sponsors & Partners</h2>
                    <p className="section-desc">
                      Proudly supported by our organizational sponsors and community partners.
                    </p>
                  </div>
                </div>

                {sponsorsList.length === 0 ? (
                  <div className="empty-state">
                    <p>No sponsors published yet.</p>
                  </div>
                ) : (
                  <div style={{ marginTop: '1.5rem' }}>
                    <SponsorStrip sponsors={sponsorsList} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Archive Tab (Public Session Archive & Search) */}
        {activeTab === 'archive' && (
          <section id="archive-section">
            {selectedArchiveSessionId ? (
              <SessionArchive
                sessionId={selectedArchiveSessionId}
                onBack={() => setSelectedArchiveSessionId(null)}
              />
            ) : (
              <ArchiveSearch
                onSelectSession={(sessionId) => {
                  setSelectedArchiveSessionId(sessionId);
                }}
              />
            )}
          </section>
        )}

        {/* Close-Out Tab (Admin Only) */}
        {userRole === 'admin' && activeTab === 'closeout' && (
          <section id="closeout-section">
            <SessionCloseOutAdmin />
          </section>
        )}
      </main>

      {/* Role Access / Login Modal */}
      <RoleAccessModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        speakers={speakers}
        onLoginAsSpeaker={handleLoginAsSpeaker}
        onLoginAsAdmin={handleLoginAsAdmin}
        initialTab={roleModalTab}
      />

      {/* Participant QR Code Modal */}
      <ParticipantQRModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        sessionTitle="Live Conference Q&A"
        targetUrl={typeof window !== 'undefined' ? `${window.location.origin}/ask` : 'https://cellife.co.zw/ask'}
      />
    </div>
  );
}

export default App;

