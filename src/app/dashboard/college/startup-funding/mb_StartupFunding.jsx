'use client';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Trophy, FlaskConical, Palette, Banknote, Download, Mail, Info } from 'lucide-react';

const fetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load startup funding programs');
  return json;
};

const settingsFetcher = async (url) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};

const categoryMeta = {
  'Incubation & Pre-seed': { icon: <FlaskConical size={20} />, color: '#10b981' },
  'Demo Day & Pitch': { icon: <Trophy size={20} />, color: '#3b82f6' },
  'Sector Innovation Fund': { icon: <Palette size={20} />, color: '#a855f7' },
  'Mentor-linked Seed Pool': { icon: <Banknote size={20} />, color: '#f59e0b' },
};

export default function StartupFundingMobile() {
  const { addToast } = useToast();
  const [activeCat, setActiveCat] = useState('All Categories');
  const { data, error, isLoading } = useSWR('/api/college/startup-funding', fetcher);
  const { data: settingsData } = useSWR('/api/college/settings', settingsFetcher);

  const fundingLevels = useMemo(() => (Array.isArray(data?.categories) ? data.categories : []), [data]);
  const collegeName = data?.collegeName || 'Your Institution';
  const disclaimer = data?.disclaimer || '';
  const placementEmail = String(settingsData?.placementOfficer?.email || '').trim();

  const downloadGuide = () => {
    const lines = fundingLevels.flatMap((level) => [
      `${level.category}`,
      `${level.description || ''}`,
      ...level.tiers.map((tier) => `- ${tier.name}: ${tier.price} (${(tier.benefits || []).join('; ')})`),
      '',
    ]);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'college_startup_funding_guide.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Startup funding guide downloaded.', 'success');
  };

  const scheduleMeeting = () => {
    if (!placementEmail) {
      addToast('Add a placement officer email in Settings, then try again.', 'warning');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(placementEmail)}?subject=${encodeURIComponent(
      `Startup seed funding — employer inquiries for ${collegeName}`,
    )}`;
  };

  const tabs = useMemo(() => ['All Categories', ...fundingLevels.map((s) => s.category)], [fundingLevels]);
  const visibleLevels = useMemo(
    () => fundingLevels.filter((s) => activeCat === 'All Categories' || s.category === activeCat),
    [activeCat, fundingLevels],
  );

  return (
    <>
      <MobileHeader
        title="Startup seed funding"
        action={
          <button
            className="btn btn-ghost btn-sm"
            onClick={downloadGuide}
            style={{ padding: '0.4rem', color: 'var(--primary-600)' }}
          >
            <Download size={18} />
          </button>
        }
      />
      <div className="animate-fadeIn" style={{ padding: '1rem 1rem 5rem 1rem' }}>
        <div
          style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-default)',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {disclaimer ||
                'Informational catalog only. Seed investments are negotiated and executed offline — not through PlacementHub.'}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '0.5rem',
            paddingBottom: '0.75rem',
            marginBottom: '0.5rem',
            scrollbarWidth: 'none',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveCat(tab)}
              className={`btn ${activeCat === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                padding: '0.4rem 1rem',
                fontSize: '0.8rem',
                flexShrink: 0,
                border: activeCat !== tab ? '1px solid var(--border-default)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: '12px' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--danger-600)', margin: 0 }}>Failed to load startup funding programs.</p>
          </div>
        ) : visibleLevels.length === 0 ? (
          <div className="card" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No programs published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visibleLevels.map((level, i) => {
              const meta = categoryMeta[level.category] || { icon: <Trophy size={20} />, color: '#3b82f6' };
              return (
                <div key={i} className="card" style={{ padding: '1rem', borderTop: `4px solid ${meta.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {meta.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{level.category}</h3>
                    </div>
                  </div>
                  {level.description ? (
                    <p
                      style={{
                        margin: '0 0 1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {level.description}
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {level.tiers.map((tier, ti) => (
                      <div
                        key={ti}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          padding: '1rem',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{tier.name}</h4>
                          {tier.label ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                              {tier.label}
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            marginBottom: '0.15rem',
                          }}
                        >
                          {tier.price}
                        </div>
                        <div className="text-xs text-tertiary" style={{ marginBottom: '0.75rem' }}>
                          Indicative amount
                        </div>
                        <ul
                          style={{
                            padding: 0,
                            listStyle: 'none',
                            margin: 0,
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem',
                          }}
                        >
                          {tier.benefits.map((b, bi) => (
                            <li
                              key={bi}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-secondary)' }}
                            >
                              <span style={{ color: meta.color, flexShrink: 0 }}>✓</span> <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={scheduleMeeting}
          style={{
            width: '100%',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <Mail size={16} /> Contact placement / innovation office
        </button>
      </div>
    </>
  );
}
