import styles from './index.module.scss';

export const Card = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className={styles.Card}>
            {children}
        </div>
    );
};