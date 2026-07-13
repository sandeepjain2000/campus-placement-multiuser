/**
 * @jest-environment jsdom
 */
const React = require('react');
const { render } = require('@testing-library/react');
const { useStudentApplyWithCvModal } = require('../StudentCvApply');

function Harness({ renderExtras }) {
  const { applyModal } = useStudentApplyWithCvModal({
    onApply: jest.fn(),
    renderExtras,
  });
  return applyModal;
}

describe('useStudentApplyWithCvModal renderExtras', () => {
  it('passes submitting state without TDZ when renderExtras runs during hook init', () => {
    const renderExtras = jest.fn((_metadata, ctx) => {
      expect(ctx).toEqual({ submitting: false });
      return React.createElement('span', { 'data-testid': 'extras' }, 'ok');
    });

    expect(() => render(React.createElement(Harness, { renderExtras }))).not.toThrow();
    expect(renderExtras).toHaveBeenCalled();
  });
});
