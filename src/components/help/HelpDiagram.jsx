'use client';

import HelpFlowDiagram from '@/components/help/HelpFlowDiagram';
import HelpUseCaseDiagram from '@/components/help/HelpUseCaseDiagram';
import { HELP_DIAGRAMS } from '@/content/helpDocumentation';

export default function HelpDiagram({ diagramId }) {
  const spec = HELP_DIAGRAMS[diagramId];
  if (!spec) return null;

  if (spec.type === 'flow') {
    return <HelpFlowDiagram steps={spec.steps} caption={spec.caption} />;
  }

  if (spec.type === 'usecase') {
    return (
      <HelpUseCaseDiagram
        hub={spec.hub}
        actors={spec.actors}
        seasonFlow={spec.seasonFlow}
        caption={spec.caption}
      />
    );
  }

  return null;
}
