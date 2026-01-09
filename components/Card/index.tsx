import styles from './index.module.scss';

interface CardProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const Card = ({ children, style, onClick }: CardProps) => {
    return (
        <div 
            className={styles.Card}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};