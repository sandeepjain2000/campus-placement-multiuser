'use client';

import ResponsiveWrapper from '@/components/mobile/ResponsiveWrapper';
import DesktopCollegeStudents from './DesktopCollegeStudents';
import CollegeStudentsMobile from './mb_CollegeStudents';

export default function CollegeStudentsPage() {
  return (
    <ResponsiveWrapper 
      desktopView={<DesktopCollegeStudents />}
      mobileView={<CollegeStudentsMobile />}
    />
  );
}
