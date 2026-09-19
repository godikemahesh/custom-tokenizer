interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="banner-error" role="alert">
      <strong style={{ color: "var(--accent-error)" }}>Something needs your attention: </strong>
      <span>{message}</span>
    </div>
  );
}
