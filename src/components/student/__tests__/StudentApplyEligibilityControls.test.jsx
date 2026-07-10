/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const StudentApplyEligibilityControls = require('../StudentApplyEligibilityControls').default;

describe('StudentApplyEligibilityControls', () => {
  const studentPass = { cgpa: 8, hasResume: true, isPlacementLocked: false };
  const opportunity = { minCgpa: 7, status: 'published' };

  it('enables Apply when student meets all criteria', () => {
    render(
      React.createElement(StudentApplyEligibilityControls, {
        opportunity,
        student: studentPass,
        applyLabel: 'Apply to this Internship',
        blockReason: null,
        onApply: jest.fn(),
      }),
    );

    const btn = screen.getByRole('button', { name: /Apply to this Internship/i });
    expect(btn).not.toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();
    expect(screen.queryByText(/below the minimum required/i)).not.toBeInTheDocument();
  });

  it('disables Apply and shows CGPA reason when below minimum', () => {
    render(
      React.createElement(StudentApplyEligibilityControls, {
        opportunity,
        student: { ...studentPass, cgpa: 6 },
        applyLabel: 'Apply to this Internship',
        blockReason: 'Your CGPA (6) is below the minimum required (7).',
        onApply: jest.fn(),
      }),
    );

    const btn = screen.getByRole('button', { name: /Apply to this Internship/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Your CGPA \(6\) is below the minimum required \(7\)/)).toBeInTheDocument();
  });

  it('computes block reason and disables Apply when CGPA is below minimum (no blockReason prop)', () => {
    render(
      React.createElement(StudentApplyEligibilityControls, {
        opportunity,
        student: { ...studentPass, cgpa: 6 },
        applyLabel: 'Apply to this Internship',
        onApply: jest.fn(),
      }),
    );

    expect(screen.getByRole('button', { name: /Apply to this Internship/i })).toBeDisabled();
    expect(screen.getByText(/below the minimum required/i)).toBeInTheDocument();
  });

  it('shows resume block reason when CV is missing', () => {
    render(
      React.createElement(StudentApplyEligibilityControls, {
        opportunity,
        student: { ...studentPass, hasResume: false },
        applyLabel: 'Apply',
        blockReason: 'Upload your primary CV on your profile before you can apply.',
        onApply: jest.fn(),
      }),
    );

    expect(screen.getByRole('button', { name: /^Apply$/i })).toBeDisabled();
    expect(screen.getByText(/Upload your primary CV/i)).toBeInTheDocument();
  });

  it('expands eligibility checklist when Why not eligible is clicked', () => {
    render(
      React.createElement(StudentApplyEligibilityControls, {
        opportunity,
        student: { ...studentPass, cgpa: 5 },
        applyLabel: 'Apply',
        blockReason: 'Your CGPA (5) is below the minimum required (7).',
        onApply: jest.fn(),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Why not eligible/i }));
    expect(screen.getByRole('heading', { name: /Your eligibility/i })).toBeInTheDocument();
    expect(screen.getByText(/Minimum CGPA/i)).toBeInTheDocument();
  });
});
