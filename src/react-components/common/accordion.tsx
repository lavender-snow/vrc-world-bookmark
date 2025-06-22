import { useState } from 'react';

import styles from './accordion.scss';

export function Accordion({ icon: Icon, title, children, defaultOpen = false, onToggle }: { icon: React.FC<React.SVGProps<SVGSVGElement>>, title: string; children: React.ReactNode, defaultOpen?: boolean, onToggle?: (isOpen: boolean) => void }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.accordionButton} aria-expanded={open}>
      <div className={styles.accordionTitle} onClick={() => {
        const newValue = !open;
        setOpen(newValue);
        if (onToggle) {
          onToggle(newValue);
        }
      }}><Icon /> <span>{title}</span> {open ? '▲' : '▼'} </div>
      {open && (
        <div
          className={styles.accordionContent}
        >
          {children}
        </div>
      )}
    </div>
  );
}
