import { useEffect } from "react";
import styles from "./toast.scss";
import { parseSassTime } from "./util";

export function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  // Sassで定義した時間を基にトーストの表示時間を計算
  const displayTime = parseSassTime(styles.FADEIN) + parseSassTime(styles.FADEIN) + parseSassTime(styles.VISIBLE);
  useEffect(() => {

    const timer = setTimeout(onClose, displayTime);
    return () => clearTimeout(timer);
  }, [onClose]);
  if (!message) return null;
  return (
    <div className={styles.toast}>{message}</div>
  );
}
