import {withProfiler} from '@sentry/react';
import classNames from 'classnames';

type Props = {
  children?: React.ReactNode;
  className?: string;
  dark?: boolean;
  ['data-test-id']?: string;
  hideMessage?: boolean;
  hideSpinner?: boolean;
  mini?: boolean;
  overlay?: boolean;
  relative?: boolean;
  size?: number;
  style?: React.CSSProperties;
};

function LoadingIndicator(props: Props) {
  const {
    hideMessage,
    mini,
    overlay,
    dark,
    children,
    className,
    style,
    relative,
    size,
    hideSpinner,
    ['data-test-id']: dataTestId,
  } = props;
  const cx = classNames(className, {
    overlay,
    dark,
    loading: true,
    mini,
  });

  const loadingCx = classNames({
    relative,
    'loading-indicator': true,
  });

  let loadingStyle: React.CSSProperties = {};
  if (size) {
    loadingStyle = {
      width: size,
      height: size,
    };
  }

  return (
    <div className={cx} style={style} data-test-id={dataTestId ?? 'loading-indicator'}>
      {!hideSpinner && <div className={loadingCx} style={loadingStyle} />}
      {!hideMessage && <div className="loading-message">{children}</div>}
    </div>
  );
}

export default withProfiler(LoadingIndicator, {
  includeUpdates: false,
});
