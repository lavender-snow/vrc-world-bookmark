import { useState } from 'react';

import style from './accordion.scss';

export function Accordion({ icon: Icon, title, children, defaultOpen = false, onToggle }: { icon: React.FC<React.SVGProps<SVGSVGElement>>, title: string; children: React.ReactNode, defaultOpen?: boolean, onToggle?: (isOpen: boolean) => void }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={style.accordionButton} aria-expanded={open}>
      <div className={style.accordionTitle} onClick={() => {
        const newValue = !open;
        setOpen(newValue);
        if (onToggle) {
          onToggle(newValue);
        }
      }}><Icon /> <span>{title}</span> {open ? '▲' : '▼'} </div>
      {open && (
        <div
          className={style.accordionContent}
        >
          {children}
        </div>
      )}
    </div>
  );
}
