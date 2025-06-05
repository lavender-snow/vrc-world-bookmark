import { useState } from "react";
import style from "./accordion.scss";

export function Accordion({ icon: Icon, title, children, defaultOpen = false }: { icon: React.FC<React.SVGProps<SVGSVGElement>>, title: string; children: React.ReactNode, defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={style.accordionButton} aria-expanded={open}>
      <div className={style.accordionTitle} onClick={() => setOpen((prev) => !prev)}><Icon /> {title} {open ? "▲" : "▼"} </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}
