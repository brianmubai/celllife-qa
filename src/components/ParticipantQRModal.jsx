import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function ParticipantQRModal({
  isOpen,
  onClose,
  sessionTitle = 'Live Q&A Session',
  targetUrl = '',
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Compute meaningful default Q&A URL
  const defaultUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ask`
    : 'https://cellife.co.zw/ask';
  const urlToEncode = targetUrl || defaultUrl;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        urlToEncode,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [isOpen, urlToEncode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(urlToEncode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'celllife-qa-qrcode.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card qr-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '90%',
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>📱</span>
          <h2 style={{ margin: '0.5rem 0 0.25rem', color: '#0f172a', fontSize: '1.5rem' }}>
            Scan to Join Live Q&A
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {sessionTitle}
          </p>
        </div>

        {/* QR Code Container */}
        <div
          style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'inline-block',
            margin: '0.75rem auto 1.25rem',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />
        </div>

        {/* Meaningful URL display */}
        <div
          style={{
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <code
            style={{
              color: '#0284c7',
              fontWeight: 700,
              fontSize: '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {urlToEncode}
          </code>
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn btn-sm"
            style={{
              background: copied ? '#10b981' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem' }}>
          Point your smartphone camera at this QR code to submit questions and upvote in real time.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleDownloadQR}
            className="btn btn-outline"
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              background: '#ffffff',
            }}
          >
            💾 Download QR Image
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
