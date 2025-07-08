import classNames from 'classnames';

import styles from './toast.scss';

import { ReactComponent as ErrorIcon } from 'assets/images/HeroiconsXMark.svg';
import { ReactComponent as SuccessIcon } from 'assets/images/MaterialSymbolsCheckRounded.svg';
import { ReactComponent as InfoIcon } from 'assets/images/MaterialSymbolsInfoOutline.svg';
import { ReactComponent as WarningIcon } from 'assets/images/MaterialSymbolsWarningOutline.svg';
import { NoticeType } from 'src/consts/const';

function Icon({ noticeType }: { noticeType: NoticeType }) {
  const icons = {
    [NoticeType.success]: <SuccessIcon data-testid='icon-success'/>,
    [NoticeType.warning]: <WarningIcon data-testid='icon-warning'/>,
    [NoticeType.error]: <ErrorIcon data-testid='icon-error'/>,
    [NoticeType.info]: <InfoIcon data-testid='icon-info'/>,
  };

  return icons[noticeType];
}

const SECONDS_PER_CHARACTER = 0.08;
const FADEIN = 0.4;
const FADEOUT = 0.6;

export function Toast({ message, onClose, noticeType = NoticeType.info }: { message: string, onClose: () => void, noticeType?: NoticeType }) {
  if (!message) return null;

  const visible = Math.max(2, message.length * SECONDS_PER_CHARACTER);

  const animation = `fadein ${FADEIN}s, fadeout ${FADEOUT}s ${FADEIN + visible}s forwards`;

  return (
    <div
      className={classNames(styles.toast, styles[noticeType])}
      style={{ animation }}
      onAnimationEnd={(e) => {
        if (e.animationName.includes('fadeout')) {
          onClose();
        }
      }}
    >
      <Icon noticeType={noticeType} />
      <span>{message}</span>
    </div>
  );
}
