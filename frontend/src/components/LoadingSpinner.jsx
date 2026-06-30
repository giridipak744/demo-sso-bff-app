import './LoadingSpinner.css';

export default function LoadingSpinner({ fullPage = true }) {
  return (
    <div className={fullPage ? 'spinner-page' : 'spinner-inline'}>
      <div className="spinner" />
    </div>
  );
}
