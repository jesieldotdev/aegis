import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps, defaults: Partial<SVGProps<SVGSVGElement>> = {}) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...defaults,
    ...rest,
  };
}

export function IconFingerprint(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    </svg>
  );
}

export function IconPadlock(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2.2 })}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconKebab(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M17.9 17.9A9.8 9.8 0 0112 19c-6.5 0-10-7-10-7a17.4 17.4 0 014.1-4.9M9.9 5.2A9.5 9.5 0 0112 5c6.5 0 10 7 10 7a17.5 17.5 0 01-2.2 3.2" />
      <path d="M9.4 9.4a3 3 0 104.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconKey(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2.4 })}>
      <circle cx="9" cy="12" r="4" />
      <path d="M13 12h8M18 12v3" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}

export function IconQrPlus(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <path d="M21 12a9 9 0 11-2.6-6.4M21 4v5h-5" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

export function IconCloudUpload(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.8 })}>
      <path d="M18 10a5 5 0 00-9.6-1.6A4 4 0 006 16h11a3.5 3.5 0 001-6.9z" />
      <path d="M12 12v5M9.5 14.5L12 12l2.5 2.5" />
    </svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
    </svg>
  );
}

export function IconSliders(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <path d="M4 20v-5M4 8V4M12 20v-8M12 6V4M20 20v-3M20 10V4" />
      <circle cx="4" cy="11" r="2" />
      <circle cx="12" cy="9" r="2" />
      <circle cx="20" cy="13" r="2" />
    </svg>
  );
}

export function IconVaultDial(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 1.9 })}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 8.8V6M12 18v-2.8M15.2 12H18M6 12h2.8" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2.4 })}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props, { strokeWidth: 2 })}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Logo do Google (4 cores) — usar asset oficial nas diretrizes do Google. */
export function IconGoogle({ size = 14, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.3-1 7.1-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.5 1.1-2.7 0-5-1.8-5.8-4.3H2.5v2.8A10.7 10.7 0 0012 23z" />
      <path fill="#FBBC05" d="M6.2 14.5a6.4 6.4 0 010-4.1V7.6H2.5a10.7 10.7 0 000 9.6l3.7-2.7z" />
      <path fill="#EA4335" d="M12 5.5c1.5 0 2.9.5 4 1.6l3-3A10.3 10.3 0 002.5 7.6l3.7 2.8C7 7.9 9.3 5.5 12 5.5z" />
    </svg>
  );
}
