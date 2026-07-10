const fs = require('fs');
const files = [
  'src/app/dashboard/college/students/mb_CollegeStudents.jsx',
  'src/app/dashboard/college/students/MobileCollegeStudents.jsx',
];

for (const rel of files) {
  let s = fs.readFileSync(rel, 'utf8');
  s = s.split('motion.div').join('motion.div'); // noop placeholder
  s = s.replace(/motion\.motion\.div/g, 'div');
  s = s.replace(/motion\.motion.div/g, 'div');

  if (!s.includes('StudentQuickViewModal')) {
    s = s.replace(
      "import { CheckCircle2, UserPlus } from 'lucide-react';",
      "import { CheckCircle2, UserPlus, Eye } from 'lucide-react';\nimport StudentQuickViewModal from './StudentQuickViewModal';",
    );
    s = s.replace(
      '  const [isLoading, setIsLoading] = useState(true);\n  \n  const reloadStudents',
      `  const [isLoading, setIsLoading] = useState(true);
  const [quickViewStudent, setQuickViewStudent] = useState(null);

  useEffect(() => {
    if (quickViewStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [quickViewStudent]);

  const reloadStudents`,
    );
    s = s.replace(
      '  }, [reloadStudents]);\n\n  const {\n    search,',
      `  }, [reloadStudents]);

  const setStudentVerified = useCallback(async (profileId, approve) => {
    try {
      const res = await fetch('/api/college/students/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfileId: profileId, approve }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      addToast(approve ? 'Student verified.' : 'Verification cleared.', 'success');
      setStudents((prev) => prev.map((s) => (s.id === profileId ? { ...s, verified: approve } : s)));
      setQuickViewStudent((d) => (d && d.id === profileId ? { ...d, verified: approve } : d));
    } catch (e) {
      addToast(e.message || 'Failed', 'error');
    }
  }, [addToast]);

  const {
    search,`,
    );
  }

  s = s.replace(
    /<Link\s+href=\{`\/dashboard\/college\/students\/\$\{s\.id\}`\}\s+key=\{s\.id\}[\s\S]*?<\/Link>/,
    (block) => {
      if (block.includes('setQuickViewStudent')) return block;
      const inner = block
        .replace(/<Link\s+href=\{`\/dashboard\/college\/students\/\$\{s\.id\}`\}\s+key=\{s\.id\}\s+style=\{[\s\S]*?\}\s*>/, '<motion.div key={s.id} style={{ border: \'1px solid var(--border-default)\', borderRadius: \'12px\', padding: \'1rem\', background: \'var(--bg-elevated)\', marginBottom: \'0.75rem\' }}>')
        .replace('</Link>', '</motion.div>');
      return inner.replace(/motion\.div/g, 'div');
    },
  );

  s = s.replace(
    /<div style=\{\{ fontWeight: 700, fontSize: '1rem', color: 'var\(--primary-700\)' \}\}>\{s\.name\}<\/div>/,
    '<Link href={`/dashboard/college/students/${s.id}`} className="student-name-link" style={{ fontSize: \'1rem\' }}>{s.name}</Link>',
  );

  if (!s.includes('setQuickViewStudent(s)')) {
    s = s.replace(
      /(\s*)<\/motion.div>\s*\n(\s*)<\/motion.div>\s*\n\s*\n\s*<div style=\{\{ marginBottom: '0\.75rem' \}\}>/,
      `$1</div>
$2<button
$2  type="button"
$2  className="btn btn-ghost btn-sm"
$2  aria-label={\`Quick view \${s.name}\`}
$2  title="Quick view"
$2  onClick={() => setQuickViewStudent(s)}
$2  style={{ flexShrink: 0 }}
$2>
$2  <Eye size={18} aria-hidden />
$2</button>
$2</div>

                  <div style={{ marginBottom: '0.75rem' }}>`,
    );
    s = s.replace(/motion\.div/g, 'motion.div');
    s = s.replace(/<\/motion\.motion.div>/g, '');
  }

  s = s.replace(/<\/Link>\s*\n\s*\);\s*\n\s*\}\)\}/, '</div>\n              );\n            })}');

  if (!s.includes('<StudentQuickViewModal')) {
    s = s.replace(
      /\n\n      <\/div>\n    <>\n  \);\n\}/,
      `\n\n      <StudentQuickViewModal
        student={quickViewStudent}
        onClose={() => setQuickViewStudent(null)}
        onVerify={setStudentVerified}
      />

      </div>
    </>
  );
}`,
    );
    s = s.replace(
      /(\n\n      <\/div>\n    <\/>\n  \);\n\})/,
      `\n\n      <StudentQuickViewModal
        student={quickViewStudent}
        onClose={() => setQuickViewStudent(null)}
        onVerify={setStudentVerified}
      />$1`,
    );
  }

  s = s.split('motion.div').join('div');
  fs.writeFileSync(rel, s);
  console.log('patched', rel);
}
