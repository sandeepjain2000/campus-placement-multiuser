'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from '@/components/ToastProvider';
import useSWR from 'swr';
import { Trophy, FlaskConical, Palette, Banknote, Info } from 'lucide-react';
const fetcher = async url => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load startup funding programs');
  return json;
};
const categoryMeta = {
  'Incubation & Pre-seed': {
    icon: <FlaskConical size={24} />,
    color: '#10b981'
  },
  'Demo Day & Pitch': {
    icon: <Trophy size={24} />,
    color: '#3b82f6'
  },
  'Sector Innovation Fund': {
    icon: <Palette size={24} />,
    color: '#a855f7'
  },
  'Mentor-linked Seed Pool': {
    icon: <Banknote size={24} />,
    color: '#f59e0b'
  }
};
const settingsFetcher = async url => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load settings');
  return json;
};
export default function StartupFundingDesktop() {
  const {
    addToast
  } = useToast();
  const [activeTab, setActiveTab] = useState('All Categories');
  const {
    data,
    error
  } = useSWR('/api/college/startup-funding', fetcher);
  const {
    data: settingsData
  } = useSWR('/api/college/settings', settingsFetcher);
  const fundingLevels = useMemo(() => Array.isArray(data?.categories) ? data.categories : [], [data]);
  const collegeName = data?.collegeName || 'Your Institution';
  const disclaimer = data?.disclaimer || '';
  const placementEmail = String(settingsData?.placementOfficer?.email || '').trim();
  const downloadGuide = () => {
    const lines = [`${collegeName} — Startup seed funding programs (informational)`, '', 'Indicative amounts only. Actual investments are negotiated offline.', '', ...fundingLevels.flatMap(level => [`${level.category}`, `${level.description || ''}`, ...level.tiers.map(tier => `- ${tier.name}: ${tier.price} (${(tier.benefits || []).join('; ')})`), ''])];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8;'
    });
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
    window.location.href = `mailto:${encodeURIComponent(placementEmail)}?subject=${encodeURIComponent(`Startup seed funding — employer inquiries for ${collegeName}`)}`;
  };
  const tabs = useMemo(() => ['All Categories', ...fundingLevels.map(s => s.category)], [fundingLevels]);
  const visibleLevels = useMemo(() => fundingLevels.filter(s => activeTab === 'All Categories' || s.category === activeTab), [activeTab, fundingLevels]);
  return <div className="animate-fadeIn" style={{
    paddingBottom: '3rem'
  }}>
      <div style={{
      position: 'relative',
      background: 'var(--card)',
      borderRadius: 'var(--radius-xl)',
      padding: '2.5rem',
      color: 'var(--foreground)',
      overflow: 'hidden',
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-xs)',
      textAlign: 'center'
    }}>
        <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)',
        borderRadius: '50%'
      }} />
        <div style={{
        position: 'relative',
        zIndex: 1
      }}>
          <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          margin: '0 0 0.75rem',
          letterSpacing: '-0.02em'
        }}>
            Campus <span style={{
            color: 'var(--muted-foreground)'
          }}>Startup Funding</span>
          </h1>
          <p style={{
          fontSize: '1.1rem',
          color: 'var(--muted-foreground)',
          maxWidth: 620,
          margin: '0 auto 1.75rem'
        }}>
            Publish what {collegeName} offers to investors and corporate partners. Employers use this catalog to learn
            about your programs — deals close offline through your innovation office.
          </p>
          <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
            <Button type="button" onClick={downloadGuide}>
              Download guide
            </Button>
            <Button onClick={scheduleMeeting} style={{
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          }}>
              Preview inquiry email
            </Button>
          </div>
        </div>
      </div>

      <Card style={{
      marginBottom: '2rem',
      padding: '1.25rem 1.5rem',
    }}><CardContent>
        <div style={{
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'flex-start'
        }}>
          <Info size={20} className="text-primary" style={{
            flexShrink: 0,
            marginTop: 2
          }} aria-hidden />
          <div>
            <h2 style={{
              margin: '0 0 0.35rem',
              fontSize: '1.05rem',
              fontWeight: 700
            }}>
              Informational only — no payments on PlacementHub
            </h2>
            <p className="text-sm text-secondary" style={{
              margin: 0,
              lineHeight: 1.55
            }}>
              {disclaimer || 'Seed investments require diligence, term sheets, shareholder agreements, and regulatory steps that are handled outside this platform. This page helps employers discover your programs; your team manages the actual investment process separately.'}
            </p>
          </div>
        </div>
      </CardContent></Card>

      <div className="text-center" style={{
      marginBottom: '3rem'
    }}>
        <h2 style={{
        fontSize: '2rem',
        marginBottom: '1rem'
      }}>Published programs</h2>
        <div style={{
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
          {tabs.map(tab => <Button key={tab} onClick={() => setActiveTab(tab)} variant={activeTab === tab ? 'default' : 'ghost'} style={{
          borderRadius: '2rem'
        }}>
              {tab}
            </Button>)}
        </div>
      </div>

      <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '2rem'
    }}>
        {visibleLevels.map((level, i) => {
        const meta = categoryMeta[level.category] || {
          icon: <Trophy size={24} />,
          color: '#3b82f6'
        };
        return <Card key={i} style={{
          padding: '2rem'
        }}><CardContent>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
                <div style={{
                background: meta.color,
                width: '50px',
                height: '50px',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--foreground)'
              }}>
                  {meta.icon}
                </div>
                <div>
                  <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem'
                }}>{level.category}</h3>
                  <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>{level.description}</p>
                </div>
              </div>

              <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
                {level.tiers.map((tier, ti) => <div key={ti} style={{
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                padding: '1.5rem',
              }}>
                    <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                      <div>
                        <h4 style={{
                      margin: 0,
                      fontSize: '1rem'
                    }}>{tier.name}</h4>
                        <div style={{
                      fontSize: '1.75rem',
                      fontWeight: 800,
                      color: '#2563eb'
                    }}>{tier.price}</div>
                        <div className="text-xs text-tertiary" style={{
                      marginTop: '0.25rem'
                    }}>
                          Indicative amount
                        </div>
                      </div>
                      {tier.label ? <StatusBadge tone="indigo">{tier.label}</StatusBadge> : null}
                    </div>
                    <ul style={{
                  padding: 0,
                  listStyle: 'none',
                  margin: 0,
                  fontSize: '0.875rem'
                }}>
                      {tier.benefits.map((b, bi) => <li key={bi} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                          <span style={{
                      color: meta.color
                    }}>✓</span> {b}
                        </li>)}
                    </ul>
                  </div>)}
              </div>
            </CardContent></Card>;
      })}
      </div>

      {error ? <Card style={{
      marginTop: '1rem'
    }}><CardContent>
          <p className="text-secondary">Failed to load startup funding programs.</p>
        </CardContent></Card> : null}
      {!error && fundingLevels.length === 0 ? <Card style={{
      marginTop: '1rem'
    }}><CardContent>
          <p className="text-secondary">No active startup funding programs are published yet.</p>
        </CardContent></Card> : null}
    </div>;
}
