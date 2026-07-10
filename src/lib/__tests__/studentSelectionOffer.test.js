import {
  findOfferForApplication,
  resolveStudentSelectionOfferState,
  studentApplicationsHrefForType,
} from '@/lib/studentSelectionOffer';

describe('studentSelectionOffer', () => {
  const offers = [
    {
      id: 'o1',
      company: 'TechCorp',
      role: 'SDE',
      driveId: 'd1',
      applicationId: 'a1',
      status: 'pending',
      offerLetterUrl: 'https://example.com/letter.pdf',
    },
  ];

  const application = {
    id: 'a1',
    driveId: 'd1',
    company: 'TechCorp',
    role: 'SDE',
    status: 'selected',
  };

  test('findOfferForApplication matches by application id', () => {
    expect(findOfferForApplication(offers, application)).toEqual(offers[0]);
  });

  test('resolveStudentSelectionOfferState awaiting formal offer when no offer row', () => {
    expect(resolveStudentSelectionOfferState(application, [], { type: 'drives' })).toEqual({
      kind: 'awaiting_formal_offer',
      offer: null,
    });
  });

  test('resolveStudentSelectionOfferState pending formal offer', () => {
    expect(resolveStudentSelectionOfferState(application, offers, { type: 'drives' })).toEqual({
      kind: 'formal_offer_pending',
      offer: offers[0],
    });
  });

  test('studentApplicationsHrefForType', () => {
    expect(studentApplicationsHrefForType('internships')).toBe('/dashboard/student/applications/internships');
  });
});
