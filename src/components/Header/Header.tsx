import styles from './Header.module.css';

export function Header(): React.JSX.Element {
  return (
    <header className={styles['header']}>
      <img
        className={styles['logo']}
        src="/skywords/dhcp_logo.jpeg"
        alt="DHPC Logo"
      />
      <span className={styles['title']}>Skywords</span>
    </header>
  );
}
