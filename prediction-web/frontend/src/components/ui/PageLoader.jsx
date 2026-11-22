import { LogoMark } from './Logo';

export default function PageLoader({ fullScreen = true }) {
  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-screen' : 'min-h-[50vh]'}`}>
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-12 animate-pulse" />
        <span className="loading loading-dots loading-md text-primary" />
      </div>
    </div>
  );
}
