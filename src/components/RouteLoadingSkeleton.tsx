import styles from './RouteLoadingSkeleton.module.css';

interface RouteLoadingSkeletonProps {
    titleWidth?: string;
    lineWidths?: string[];
}

export function RouteLoadingSkeleton({
    titleWidth = '70%',
    lineWidths = ['100%', '85%', '70%'],
}: RouteLoadingSkeletonProps) {
    return (
        <div className={styles.container} aria-busy="true" aria-live="polite">
            <div className={styles.header}>
                <div className={`skeleton ${styles.title}`} style={{ width: titleWidth }} />
                <div className={`skeleton ${styles.subtitle}`} />
            </div>

            <div className={styles.card}>
                {lineWidths.map((width, index) => (
                    <div key={index} className={`skeleton ${styles.line}`} style={{ width }} />
                ))}
            </div>
        </div>
    );
}
