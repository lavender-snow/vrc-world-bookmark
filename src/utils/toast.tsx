import classNames from 'classnames';

import styles from './toast.scss';

import { ReactComponent as ErrorIcon } from 'assets/images/HeroiconsXMark.svg';
import { ReactComponent as SuccessIcon } from 'assets/images/MaterialSymbolsCheckRounded.svg';
import { ReactComponent as InfoIcon } from 'assets/images/MaterialSymbolsInfoOutline.svg';
import { ReactComponent as WarningIcon } from 'assets/images/MaterialSymbolsWarningOutline.svg';
import { NoticeType } from 'src/consts/const';

function Icon({ noticeType }: { noticeType: NoticeType }) {
  const icons = {
    [NoticeType.success]: <SuccessIcon />,
    [NoticeType.warning]: <WarningIcon />,
    [NoticeType.error]: <ErrorIcon />,
    [NoticeType.info]: <InfoIcon />,
  };

  return icons[noticeType];
}

export function Toast({ message, onClose, noticeType = NoticeType.info }: { message: string, onClose: () => void, noticeType?: NoticeType }) {
  if (!message) return null;

  return (
    <div className={classNames(styles.toast, styles[noticeType])} onAnimationEnd={(e) => {
      if (e.animationName.includes('fadeout')) {
        onClose();
      }
    }}>
      <Icon noticeType={noticeType} />
      {message}
    </div>
  );
}
