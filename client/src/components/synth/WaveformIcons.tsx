interface IconProps {
  className?: string;
}

export function Waves({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12c1.5-3 3-5 5-5s3.5 2 5 5 3 5 5 5 3.5-2 5-5" strokeLinecap="round" />
    </svg>
  );
}

export function Triangle({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 18L8 6l6 12 6-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Square({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 18V6h6v12h6V6h6v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SawWave({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 18L8 6v12l6-12v12l6-12v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
