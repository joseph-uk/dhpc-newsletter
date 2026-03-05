import styles from './Header.module.css';

interface HeaderProps {
  readonly title: string | undefined;
}

export function Header({ title }: HeaderProps): React.JSX.Element {
  return (
    <header className={styles['header']}>
      <img
        className={styles['logo']}
        src={`${import.meta.env.BASE_URL}dhcp_logo.jpeg`}
        alt="DHPC Logo"
      />
      <span className={styles['title']}>{title ?? 'Skywords'}</span>
    </header>
  );
}
