import { LogoMark } from './Logo';

export default function PageLoader({ fullScreen = true }) {
  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-screen' : 'min-h-[40vh]'}`}>
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-10 animate-pulse" />
        <span className="loading loading-dots loading-sm text-primary" />
      </div>
    </div>
  );
}
