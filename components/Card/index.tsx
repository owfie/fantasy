import styles from './index.module.scss';

interface CardProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
    className?: string;
    ref?: React.RefObject<HTMLDivElement>;
}

export const Card = ({ children, style, onClick, className, ref }: CardProps) => {
    return (
        <div
            ref={ref}
            className={`${styles.Card} ${className}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};