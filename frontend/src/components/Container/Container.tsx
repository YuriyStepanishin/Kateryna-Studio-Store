import type { ReactNode } from 'react';
import css from '../shared/Layout.module.css';
export default function Container({ children }: {
    children: ReactNode;
}) { return <div className={css.container}>{children}</div>; }
