'use client';

import { useParams } from 'next/navigation';
import AdminCollegeProfileScreen from '@/components/admin/AdminCollegeProfileScreen';

export default function AdminCollegeProfilePage() {
  const params = useParams();
  const collegeId = String(params?.id || '').trim();

  return <AdminCollegeProfileScreen collegeId={collegeId} />;
}
