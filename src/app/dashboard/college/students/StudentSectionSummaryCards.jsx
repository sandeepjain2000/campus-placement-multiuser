'use client';

import {
  SECTION_FILTER_GTE5,
  SECTION_FILTER_LTE4,
} from '@/lib/studentProfileSections';

function SummaryCard({ title, description, count, total, active, onClick }) {
  return (
    <button
      type="button"
      className={`student-section-summary-card${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="student-section-summary-card-value">{count}</div>
      <div className="student-section-summary-card-title">{title}</div>
      <div className="student-section-summary-card-meta">
        {description}
        {total != null ? (
          <span style={{ opacity: 0.75 }}> · {total} enrolled</span>
        ) : null}
      </div>
    </button>
  );
}

export default function StudentSectionSummaryCards({
  lte4Count,
  gte5Count,
  totalStudents,
  sectionFilters,
  onToggleSectionFilter,
}) {
  const lte4Active = sectionFilters.includes(SECTION_FILTER_LTE4);
  const gte5Active = sectionFilters.includes(SECTION_FILTER_GTE5);

  return (
    <div
      className="student-section-summary-row"
      aria-label="Profile section completion summary"
    >
      <SummaryCard
        title="4 sections or fewer"
        description="Profile mostly incomplete"
        count={lte4Count}
        total={totalStudents}
        active={lte4Active}
        onClick={() => onToggleSectionFilter(SECTION_FILTER_LTE4)}
      />
      <SummaryCard
        title="5 sections or more"
        description="Profile largely complete"
        count={gte5Count}
        total={totalStudents}
        active={gte5Active}
        onClick={() => onToggleSectionFilter(SECTION_FILTER_GTE5)}
      />
    </div>
  );
}
