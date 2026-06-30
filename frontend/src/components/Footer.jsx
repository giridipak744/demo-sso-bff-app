import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <span className="footer-copyright">© {year} Corenroll. All rights reserved.</span>
      <div className="footer-links">
        <a href="#privacy" className="footer-link">Privacy</a>
        <a href="#terms" className="footer-link">Terms of Service</a>
        <a href="#status" className="footer-link">Status</a>
      </div>
    </footer>
  );
}
