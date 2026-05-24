import { ReactNode } from 'react';
import styles from './ResultsCard.module.css';

export interface ResultsCardProps {
    title: string;
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error';
    actions?: ReactNode;
    className?: string;
}

export function ResultsCard({
    title,
    children,
    variant = 'default',
    actions,
    className = '',
}: ResultsCardProps) {
    return (
        <div className={`${styles.card} ${styles[variant]} ${className}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
            <div className={styles.content}>{children}</div>
        </div>
    );
}
