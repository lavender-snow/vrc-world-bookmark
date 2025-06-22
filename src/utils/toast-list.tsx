import { Toast } from './toast';
import styles from './toast-list.scss';

import { NoticeType } from 'src/consts/const';

export function ToastList({ toasts, removeToast }: { toasts: { id: string, message: string, noticeType?: NoticeType }[], removeToast: (id: string) => void }) {
  return (
    <div className={styles.toastList}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          noticeType={toast.noticeType}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
