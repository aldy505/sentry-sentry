import {useRef} from 'react';

import {Button} from 'sentry/components/core/button';
import type {UseFeedbackOptions} from 'sentry/components/feedback/widget/useFeedback';
import useFeedbackWidget from 'sentry/components/feedback/widget/useFeedbackWidget';
import {IconMegaphone} from 'sentry/icons/iconMegaphone';
import {t} from 'sentry/locale';

export default function FeedbackWidgetButton({
  optionOverrides,
}: {
  optionOverrides?: UseFeedbackOptions;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const feedback = useFeedbackWidget({buttonRef, optionOverrides});

  // Do not show button if Feedback integration is not enabled
  if (!feedback) {
    return null;
  }

  return (
    <Button ref={buttonRef} size="sm" icon={<IconMegaphone />}>
      {t('Give Feedback')}
    </Button>
  );
}
