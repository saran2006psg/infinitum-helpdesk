'use client';

import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ParticipantDetails } from '@/types';

export default function ProvideKit() {
  const router = useRouter();
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [participantData, setParticipantData] = useState<ParticipantDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-fetch when all 4 digits entered
    if (index === 3 && value && newOtpDigits.every(digit => digit !== '')) {
      fetchParticipantDetails(newOtpDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fetchParticipantDetails = async (lastFourDigits: string) => {
    setError('');
    setSuccess('');
    setLoading(true);
    setParticipantData(null);

    try {
      const participantId = `INFIN${lastFourDigits}`;
      
      // TODO: Replace with actual API endpoint
      const response = await fetch(`/api/participant/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipantData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Participant not found');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch participant error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProvideKit = async () => {
    if (!participantData) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch(`/api/participant/${participantData.participant_id}/kit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          kit_provided: true
        }),
      });

      if (response.ok) {
        setSuccess('Kit provided successfully!');
        
        // Reset form after 2 seconds
        setTimeout(() => {
          setOtpDigits(['', '', '', '']);
          setParticipantData(null);
          setSuccess('');
          inputRefs.current[0]?.focus();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to mark kit as provided');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Provide kit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOtpDigits(['', '', '', '']);
    setParticipantData(null);
    setError('');
    setSuccess('');
    inputRefs.current[0]?.focus();
  };

  const canProvideKit = participantData && 
    participantData.payment_status && 
    !participantData.kit_provided;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Provide Kit</h1>
      </div>

      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* ID Input Section */}
        <section>
          <h2 className="section-title">Enter Kriya ID</h2>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <p style={{ fontSize: '16px', color: 'var(--text-gray)', marginBottom: '16px' }}>
              Enter the last 4 digits of participant ID
            </p>
            <div className="otp-input-group">
              <span className="otp-prefix">KRIYA</span>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  className="otp-input"
                  maxLength={1}
                  value={digit}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading participant details...</p>
            </div>
          )}
        </section>

        {/* Participant Details */}
        {participantData && (
          <>
            <hr className="section-divider" />
            <section>
              <h2 className="section-title">Participant Details</h2>
              
              {participantData.kit_provided && (
                <div className="alert alert-warning">
                  ⚠️ Kit already provided to this participant!
                </div>
              )}

              {!participantData.payment_status && (
                <div className="alert alert-error">
                  ❌ Payment not completed. Cannot provide kit.
                </div>
              )}

              <div className="participant-details">
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{participantData.name}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Participant ID:</span>
                  <span className="detail-value">{participantData.participant_id}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">College:</span>
                  <span className="detail-value">{participantData.college}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Payment Status:</span>
                  <span className={participantData.payment_status ? 'status-paid' : 'status-unpaid'}>
                    {participantData.payment_status ? 'Paid ✓' : 'Not Paid ✗'}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Kit Type:</span>
                  <span className="detail-value">{participantData.kit_type || 'General'}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Kit Status:</span>
                  <span className={participantData.kit_provided ? 'status-paid' : 'status-unpaid'}>
                    {participantData.kit_provided ? 'Already Provided ✓' : 'Not Provided'}
                  </span>
                </div>
              </div>

              <div className="btn-group">
                <button 
                  className="btn btn-primary" 
                  onClick={handleProvideKit}
                  disabled={!canProvideKit || loading}
                >
                  {loading ? 'Processing...' : 'Provide Kit'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            </section>
          </>
        )}

        {/* No Data Message */}
        {!loading && !participantData && otpDigits.every(d => d !== '') && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-gray)' }}>
            <h3>No Data Available!</h3>
            <p>Please check the ID and try again.</p>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => router.push('/')}
            style={{ maxWidth: '200px' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
