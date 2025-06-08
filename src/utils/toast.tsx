import classNames from 'classnames';
import { useEffect } from 'react';

import styles from './toast.scss';
import { parseSassTime } from './util';

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
  // Sassで定義した時間を基にトーストの表示時間を計算
  const displayTime = parseSassTime(styles.FADEIN) + parseSassTime(styles.FADEOUT) + parseSassTime(styles.VISIBLE);
  useEffect(() => {

    const timer = setTimeout(onClose, displayTime);
    return () => clearTimeout(timer);
  }, [onClose]);
  if (!message) return null;
  return (
    <div className={classNames(styles.toast, styles[noticeType])}>
      <Icon noticeType={noticeType} />
      {message}
    </div>
  );
}
