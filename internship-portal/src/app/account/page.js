'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Check,
  Circle,
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Laptop,
  Monitor,
  Save,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import '@/components/ip/ip-account-gemini.css';

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#e2e8f0', text: '#94a3b8' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  switch (score) {
    case 1:
      return { score: 25, label: 'Weak', color: '#ef4444', text: '#dc2626' };
    case 2:
      return { score: 50, label: 'Fair', color: '#f59e0b', text: '#d97706' };
    case 3:
      return { score: 75, label: 'Good', color: '#3b82f6', text: '#2563eb' };
    case 4:
      return { score: 100, label: 'Strong', color: '#10b981', text: '#059669' };
    default:
      return { score: 0, label: '', color: '#e2e8f0', text: '#94a3b8' };
  }
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'Active just now';
  if (diff < 3600_000) return `Active ${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86400_000) return `Active ${Math.floor(diff / 3600_000)} hours ago`;
  return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export default function AccountPage() {
  const { data: session, update: updateSession } = useSession();
  const [tab, setTab] = useState('security');
  const [showBanner, setShowBanner] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileHref, setProfileHref] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMode, setTwoFactorMode] = useState(null); // 'enable' | 'disable' | null
  const [twoFactorHint, setTwoFactorHint] = useState('');

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const reqs = useMemo(
    () => ({
      len: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      num: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    }),
    [newPassword],
  );

  function showToast(msg) {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3200);
  }

  async function loadProfile() {
    const res = await fetch('/api/ip/account/profile');
    if (!res.ok) return;
    const data = await res.json();
    setFullName(data.name || '');
    setEmail(data.email || '');
    setProfileHref(data.profileHref || null);
  }

  async function loadSessions() {
    const res = await fetch('/api/ip/account/sessions');
    if (!res.ok) return;
    const data = await res.json();
    setSessions(data.items || []);
  }

  async function loadTwoFactor() {
    const res = await fetch('/api/ip/account/2fa');
    if (!res.ok) return;
    const data = await res.json();
    setTwoFactorEnabled(Boolean(data.enabled));
  }

  useEffect(() => {
    loadProfile();
    loadTwoFactor();
  }, []);

  useEffect(() => {
    if (tab === 'sessions') loadSessions();
  }, [tab]);

  async function startTwoFactor(mode) {
    setTwoFactorBusy(true);
    setTwoFactorHint('');
    try {
      const res = await fetch('/api/ip/account/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode === 'enable' ? 'start-enable' : 'start-disable' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Could not start verification');
        return;
      }
      setTwoFactorMode(mode);
      setTwoFactorChallengeId(data.challengeId || '');
      setTwoFactorCode('');
      setTwoFactorHint(
        data.sentToHint
          ? `Code sent to ${data.sentToHint}`
          : 'Code sent to your account email',
      );
      showToast(data.message || 'Verification code sent');
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function confirmTwoFactor(e) {
    e?.preventDefault?.();
    if (!twoFactorMode || !twoFactorChallengeId) return;
    setTwoFactorBusy(true);
    try {
      const res = await fetch('/api/ip/account/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: twoFactorMode === 'enable' ? 'confirm-enable' : 'confirm-disable',
          challengeId: twoFactorChallengeId,
          code: twoFactorCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Invalid code');
        return;
      }
      setTwoFactorEnabled(Boolean(data.enabled));
      setTwoFactorMode(null);
      setTwoFactorChallengeId('');
      setTwoFactorCode('');
      setTwoFactorHint('');
      showToast(data.message || 'Updated');
    } finally {
      setTwoFactorBusy(false);
    }
  }

  function onTwoFactorToggle() {
    if (twoFactorBusy) return;
    if (twoFactorMode) {
      setTwoFactorMode(null);
      setTwoFactorChallengeId('');
      setTwoFactorCode('');
      setTwoFactorHint('');
      return;
    }
    startTwoFactor(twoFactorEnabled ? 'disable' : 'enable');
  }

  async function submitPassword(e) {
    e.preventDefault();
    setPwError('');
    if (!currentPassword) {
      setPwError('Please enter your current or temporary password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (!reqs.upper || !reqs.num || !reqs.special) {
      setPwError('New password must include uppercase, number, and special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/ip/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not change password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully! Your account is secure.');
    } catch (err) {
      setPwError(err.message || 'Could not change password');
    } finally {
      setPwBusy(false);
    }
  }

  async function submitProfile(e) {
    e.preventDefault();
    setProfileBusy(true);
    try {
      const res = await fetch('/api/ip/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save profile');
      if (typeof updateSession === 'function') {
        await updateSession({ name: json.name || fullName });
      }
      showToast('Profile account details saved successfully!');
    } catch (err) {
      showToast(err.message || 'Could not save profile');
    } finally {
      setProfileBusy(false);
    }
  }

  async function revokeSession(id) {
    setSessionsBusy(true);
    try {
      const res = await fetch(`/api/ip/account/sessions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not revoke session');
      await loadSessions();
      showToast('Session revoked.');
    } catch (err) {
      showToast(err.message || 'Could not revoke session');
    } finally {
      setSessionsBusy(false);
    }
  }

  async function revokeOthers() {
    setSessionsBusy(true);
    try {
      const res = await fetch('/api/ip/account/sessions?others=1', { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not sign out other devices');
      await loadSessions();
      showToast('Signed out of all other device sessions.');
    } catch (err) {
      showToast(err.message || 'Could not sign out other devices');
    } finally {
      setSessionsBusy(false);
    }
  }

  const roleLabel =
    session?.user?.role === 'employer'
      ? 'employer'
      : session?.user?.role === 'superadmin'
        ? 'admin'
        : 'candidate';

  const otherSessions = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="ip-account">
      {toastMsg ? (
        <div className="ip-ac-toast" role="status">
          <span className="ip-ac-toast-ico">
            <Check aria-hidden />
          </span>
          <span>{toastMsg}</span>
        </div>
      ) : null}

      {showBanner ? (
        <div className="ip-ac-banner">
          <div className="ip-ac-banner-main">
            <span className="ip-ac-banner-ico">
              <KeyRound aria-hidden />
            </span>
            <div>
              <h4>First-Time Password Change Recommendation</h4>
              <p>
                If you registered via temporary credentials, please update your current temporary password to a
                secure permanent password.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ip-ac-banner-close"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss"
          >
            <X aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="ip-ac-header">
        <h1>Account Settings</h1>
        <p>
          Manage your {roleLabel} login credentials, profile security, and active workspace sessions.
        </p>
      </div>

      <div className="ip-ac-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'security'}
          className={`ip-ac-tab${tab === 'security' ? ' is-active' : ''}`}
          onClick={() => setTab('security')}
        >
          <ShieldCheck aria-hidden />
          <span>Security & Password</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'profile'}
          className={`ip-ac-tab${tab === 'profile' ? ' is-active' : ''}`}
          onClick={() => setTab('profile')}
        >
          <User aria-hidden />
          <span>Profile Info</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sessions'}
          className={`ip-ac-tab${tab === 'sessions' ? ' is-active' : ''}`}
          onClick={() => setTab('sessions')}
        >
          <Laptop aria-hidden />
          <span>Active Sessions</span>
          {sessions.length > 0 ? <span className="ip-ac-tab-count">{sessions.length}</span> : null}
        </button>
      </div>

      {tab === 'security' ? (
        <>
        <div className="ip-ac-card">
          <div className="ip-ac-card-head">
            <div>
              <h2>Change Password</h2>
              <p>Ensure your {roleLabel} account stays secure by using a strong, unique password.</p>
            </div>
            <span className="ip-ac-card-head-ico">
              <Key aria-hidden />
            </span>
          </div>
          <form className="ip-ac-card-body" onSubmit={submitPassword}>
            <div className="ip-ac-field">
              <div className="ip-ac-field-label">
                <span>
                  Current Password <span className="req">*</span>
                </span>
                <span className="ip-ac-field-hint">Temporary or current password</span>
              </div>
              <div className="ip-ac-input-wrap">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ip-ac-eye"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </div>
            </div>

            <div className="ip-ac-field">
              <div className="ip-ac-field-label">
                <span>
                  New Password <span className="req">*</span>
                </span>
              </div>
              <div className="ip-ac-input-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="ip-ac-eye"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </div>
              {newPassword ? (
                <div className="ip-ac-strength">
                  <div className="ip-ac-strength-row">
                    <span>Password strength:</span>
                    <span style={{ color: strength.text, fontWeight: 700 }}>{strength.label}</span>
                  </div>
                  <div className="ip-ac-strength-bar">
                    <div
                      className="ip-ac-strength-fill"
                      style={{ width: `${strength.score}%`, background: strength.color }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="ip-ac-field">
              <div className="ip-ac-field-label">
                <span>
                  Confirm New Password <span className="req">*</span>
                </span>
              </div>
              <div className="ip-ac-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="ip-ac-eye"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
              </div>
            </div>

            <div className="ip-ac-reqs">
              <p>Password requirements:</p>
              <div className="ip-ac-reqs-grid">
                <span className={`ip-ac-req${reqs.len ? ' is-ok' : ''}`}>
                  {reqs.len ? <Check aria-hidden /> : <Circle aria-hidden />}
                  <span>At least 8 characters</span>
                </span>
                <span className={`ip-ac-req${reqs.upper ? ' is-ok' : ''}`}>
                  {reqs.upper ? <Check aria-hidden /> : <Circle aria-hidden />}
                  <span>At least 1 uppercase letter</span>
                </span>
                <span className={`ip-ac-req${reqs.num ? ' is-ok' : ''}`}>
                  {reqs.num ? <Check aria-hidden /> : <Circle aria-hidden />}
                  <span>At least 1 number</span>
                </span>
                <span className={`ip-ac-req${reqs.special ? ' is-ok' : ''}`}>
                  {reqs.special ? <Check aria-hidden /> : <Circle aria-hidden />}
                  <span>At least 1 special character</span>
                </span>
              </div>
            </div>

            {pwError ? <p className="ip-ac-error">{pwError}</p> : null}

            <div className="ip-ac-actions">
              <button
                type="button"
                className="ip-ac-btn-ghost"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPwError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="ip-ac-btn-primary" disabled={pwBusy}>
                <Save aria-hidden />
                <span>{pwBusy ? 'Updating…' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="ip-ac-2fa">
          <div className="ip-ac-2fa-copy">
            <div className="ip-ac-2fa-title">
              <h3>Two-Factor Authentication (2FA)</h3>
              <span className="ip-ac-2fa-badge">Recommended</span>
            </div>
            <p>
              Add an extra layer of security: after password sign-in, we email a one-time code to your account
              address (or the QA mail override when configured).
            </p>
            {twoFactorHint ? <p className="ip-ac-2fa-hint">{twoFactorHint}</p> : null}
            {twoFactorMode ? (
              <form className="ip-ac-2fa-confirm" onSubmit={confirmTwoFactor}>
                <label htmlFor="ip-ac-2fa-code">Enter 6-digit email code</label>
                <div className="ip-ac-2fa-confirm-row">
                  <input
                    id="ip-ac-2fa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                  />
                  <button type="submit" className="ip-ac-btn-primary" disabled={twoFactorBusy || twoFactorCode.length !== 6}>
                    {twoFactorMode === 'enable' ? 'Enable 2FA' : 'Disable 2FA'}
                  </button>
                  <button type="button" className="ip-ac-btn-ghost" onClick={onTwoFactorToggle} disabled={twoFactorBusy}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </div>
          <button
            type="button"
            className={`ip-ac-switch${twoFactorEnabled ? ' is-on' : ''}${twoFactorMode ? ' is-pending' : ''}`}
            role="switch"
            aria-checked={twoFactorEnabled}
            aria-label="Toggle two-factor authentication"
            disabled={twoFactorBusy}
            onClick={onTwoFactorToggle}
          >
            <span className="ip-ac-switch-knob" />
          </button>
        </div>
        </>
      ) : null}

      {tab === 'profile' ? (
        <div className="ip-ac-card">
          <div className="ip-ac-card-head">
            <div>
              <h2>Personal Account Info</h2>
              <p>Update your display name. Email is your login and cannot be changed here.</p>
            </div>
          </div>
          <form className="ip-ac-card-body" onSubmit={submitProfile}>
            <div className="ip-ac-field">
              <div className="ip-ac-field-label">
                <span>Full Name</span>
              </div>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="ip-ac-field">
              <div className="ip-ac-field-label">
                <span>Primary Email Address</span>
                <span className="ip-ac-field-hint">Read-only</span>
              </div>
              <input type="email" value={email} disabled readOnly />
            </div>
            {profileHref ? (
              <p className="ip-ac-note">
                Phone and other profile details are managed on your{' '}
                <Link href={profileHref} className="ip-ac-link">
                  profile page
                </Link>
                .
              </p>
            ) : null}
            <div className="ip-ac-actions">
              <button type="submit" className="ip-ac-btn-primary" disabled={profileBusy}>
                <Check aria-hidden />
                <span>{profileBusy ? 'Saving…' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === 'sessions' ? (
        <div className="ip-ac-sessions">
          <div className="ip-ac-sessions-head">
            <div>
              <h2>Active Login Sessions</h2>
              <p>Manage devices where your PlacementHub account is currently logged in.</p>
            </div>
            <button
              type="button"
              className="ip-ac-signout-others"
              onClick={revokeOthers}
              disabled={sessionsBusy || otherSessions === 0}
            >
              Sign Out All Devices
            </button>
          </div>

          {sessions.length ? (
            sessions.map((s) => (
              <div key={s.id} className={`ip-ac-session${s.isCurrent ? ' is-current' : ''}`}>
                <div className="ip-ac-session-left">
                  <span className="ip-ac-session-ico">
                    {s.isMobile ? <Smartphone aria-hidden /> : <Monitor aria-hidden />}
                  </span>
                  <div>
                    <div className="ip-ac-session-title">
                      <span>{s.deviceLabel}</span>
                      {s.isCurrent ? <span className="ip-ac-current-pill">Current Session</span> : null}
                    </div>
                    <p className="ip-ac-session-meta">
                      {s.ip ? `IP: ${s.ip} • ` : ''}
                      {s.isCurrent ? 'This device' : formatWhen(s.lastSeenAt)}
                    </p>
                  </div>
                </div>
                {!s.isCurrent ? (
                  <button
                    type="button"
                    className="ip-ac-revoke"
                    disabled={sessionsBusy}
                    onClick={() => revokeSession(s.id)}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="ip-ac-empty">
              No tracked sessions yet. Sign out and sign in again to register this device, or refresh after navigating.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
