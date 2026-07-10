import EntityLogo from '@/components/EntityLogo';
import CompanyNameLink from '@/components/CompanyNameLink';

/** Company name + login email — two lines only. */
export default function EmployerCompanyCell({ name, website, email }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
      <EntityLogo name={name} website={website} size="sm" shape="rounded" />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.925rem',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={name}
        >
          <CompanyNameLink name={name} website={website} />
        </div>
        {email ? (
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={email}
          >
            {email}
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>—</div>
        )}
      </div>
    </div>
  );
}
