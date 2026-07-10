/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render, screen } = require('@testing-library/react');
const StudentOpportunityApplyButton = require('../StudentOpportunityApplyButton').default;

describe('StudentOpportunityApplyButton', () => {
  const row = { id: 'job-1', title: 'SDE', minCgpa: 7, status: 'published' };
  const studentPass = {
    cgpa: 8,
    branch: 'CSE',
    batchYear: 2025,
    backlogsActive: 0,
    hasResume: true,
    isPlacementLocked: false,
  };

  it('renders enabled Apply when eligible', () => {
    render(
      React.createElement(StudentOpportunityApplyButton, {
        row,
        currentStudent: studentPass,
        applyingId: null,
        onApply: jest.fn(),
      }),
    );
    expect(screen.getByRole('button', { name: /^Apply$/i })).not.toBeDisabled();
  });

  it('disables Apply when CGPA is below minimum', () => {
    render(
      React.createElement(StudentOpportunityApplyButton, {
        row,
        currentStudent: { ...studentPass, cgpa: 6 },
        applyingId: null,
        onApply: jest.fn(),
      }),
    );
    const btn = screen.getByRole('button', { name: /^Apply$/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/below the minimum required/i));
  });
});
