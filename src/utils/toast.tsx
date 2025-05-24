import { useEffect } from "react";
import styles from "./toast.scss";
import { parseSassTime } from "./util";
import classNames from "classnames";
import { NoticeType } from "../consts/const";

export function Toast({ message, onClose, noticeType = NoticeType.info }: { message: string, onClose: () => void, noticeType?: NoticeType }) {
  // Sassで定義した時間を基にトーストの表示時間を計算
  const displayTime = parseSassTime(styles.FADEIN) + parseSassTime(styles.FADEIN) + parseSassTime(styles.VISIBLE);
  useEffect(() => {

    const timer = setTimeout(onClose, displayTime);
    return () => clearTimeout(timer);
  }, [onClose]);
  if (!message) return null;
  return (
    <div className={classNames(styles.toast, styles[noticeType])}>{message}</div>
  );
}
