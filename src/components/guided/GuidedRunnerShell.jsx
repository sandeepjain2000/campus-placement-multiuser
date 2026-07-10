'use client';

import { isGuidedRunnerFeatureEnabled } from '@/lib/guidedRunnerConfig';

/** Screen tag (S-xx) is the guided-test Next control — no extra bar. */
export default function GuidedRunnerShell() {
  if (!isGuidedRunnerFeatureEnabled()) return null;
  return null;
}
