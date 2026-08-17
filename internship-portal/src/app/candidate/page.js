'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import RatingsReceivedCard from '@/components/ip/RatingsReceivedCard';
import '@/components/ip/ip-candidate-dashboard-gemini.css';

const FEATURES = [
  {
    href: '/candidate/internships',
    title: 'Browse internships',
    desc: 'Filter by stipend, eligibility, and work mode.',
  },
  {
    href: '/candidate/applications',
    title: 'My applications',
    desc: 'Track status of every application.',
  },
  {
    href: '/candidate/messages',
    title: 'Messages',
    desc: 'Chat with employers.',
  },
  {
    href: '/candidate/offers',
    title: 'Offers',
    desc: 'Review and respond to offers.',
  },
  {
    href: '/candidate/referral',
    title: 'Refer & earn',
    desc: 'Share your link and convert points.',
  },
  {
    href: '/candidate/profile',
    title: 'Profile',
    desc: 'Keep your profile ready for applications.',
  },
];

/**
 * Layout from placementhub_candidate_dashboard.html (content pane only).
 * Same live APIs / data — no backend changes.
 */
export default function CandidateDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    fetch('/api/ip/candidate/profile')
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {});
    fetch('/api/ip/candidate/applications')
      .then((r) => r.json())
      .then((d) => setApps(d.items || []))
      .catch(() => {});
    fetch('/api/ip/candidate/internships?recommended=1')
      .then((r) => r.json())
      .then((d) => setRecommended((d.items || []).slice(0, 3)))
      .catch(() => {});
    fetch('/api/ip/candidate/saved')
      .then((r) => r.json())
      .then((d) => setSaved((d.items || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  const used = apps.length;
  const completed = apps.filter((a) => a.status === 'completed');

  return (
    <div className="ip-cand-dash">
      <div className="ip-cd-welcome">
        <h1>Welcome, {session?.user?.name || 'candidate'}</h1>
        <p>{session?.user?.email || ''}</p>
      </div>

      <div className="ip-cd-stats">
        <div className="ip-cd-card ip-cd-stat">
          <p className="ip-cd-stat__label">Reward points</p>
          <p className="ip-cd-stat__value">{profile?.points ?? '—'}</p>
        </div>
        <div className="ip-cd-card ip-cd-stat">
          <p className="ip-cd-stat__label">Applications sent</p>
          <p className="ip-cd-stat__value">{used}</p>
        </div>
        <div className="ip-cd-card ip-cd-stat">
          <p className="ip-cd-stat__label">Internships Completed</p>
          <p className="ip-cd-stat__value">{completed.length}</p>
        </div>
      </div>

      <div className="ip-cd-split">
        <div className="ip-cd-card ip-cd-panel ip-cd-split__main">
          <h2>Recommended for you</h2>
          <p className="ip-cd-panel__sub">Ranked by eligibility match score</p>
          {recommended.length ? (
            <div className="ip-cd-list">
              {recommended.map((i) => (
                <div key={i.id} className="ip-cd-row">
                  <div>
                    <h3>{i.title}</h3>
                    <p>{i.company_name}</p>
                  </div>
                  <Link href={`/candidate/internships/${i.id}`} className="ip-cd-open">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="ip-cd-empty">
              <p>No recommendations yet — complete skills on your profile.</p>
            </div>
          )}
        </div>

        <div className="ip-cd-card ip-cd-panel">
          <h2>Saved internships</h2>
          <p className="ip-cd-panel__sub">Shortcuts to roles you bookmarked</p>
          {saved.length ? (
            <div className="ip-cd-list">
              {saved.map((i) => (
                <div key={i.id} className="ip-cd-row">
                  <div>
                    <h3>{i.title}</h3>
                  </div>
                  <Link href={`/candidate/internships/${i.id}`} className="ip-cd-open">
                    Open
                  </Link>
                </div>
              ))}
              <Link href="/candidate/internships?saved=1" className="ip-cd-link">
                Browse all
              </Link>
            </div>
          ) : (
            <div className="ip-cd-empty">
              <p>No saved roles yet.</p>
              <Link href="/candidate/internships?saved=1" className="ip-cd-link">
                Browse all
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="ip-cd-features">
        {FEATURES.map((f) => (
          <div key={f.href} className="ip-cd-card ip-cd-feature">
            <div>
              <h2>{f.title}</h2>
              <p>{f.desc}</p>
            </div>
            <Link href={f.href} className="ip-cd-open">
              Open
            </Link>
          </div>
        ))}
      </div>

      <div className="ip-cd-card ip-cd-ratings">
        <h2>Ratings received</h2>
        <p className="ip-cd-ratings__sub">Mutual ratings from the other party after engagement.</p>
        <div className="ip-cd-ratings__inner">
          <RatingsReceivedCard />
        </div>
      </div>
    </div>
  );
}
