import type { CSSProperties, ReactNode } from 'react';
import { statusColors } from '../lib';

interface SvgProps {
  size?: number;
  strokeWidth?: number;
  stroke?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function Svg({ size = 16, strokeWidth = 2, stroke = 'currentColor', style, children }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {children}
    </svg>
  );
}

type IconProps = Omit<SvgProps, 'children'>;

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Svg>
);
export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
);
export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);
export const ResetIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
);
export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
);
export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Svg>
);
export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    <path d="M5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6z" />
  </Svg>
);
export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />
  </Svg>
);
export const FileIcon =({ lines, ...p }: IconProps & { lines?: boolean }) => (
  <Svg {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    {lines && <path d="M9 15h6M9 18h4" />}
  </Svg>
);

/** Status pill. Size variants match the mockup: sm (table), md (cards), lg (report title). */
export function Badge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = statusColors(status);
  return (
    <span className={`pill pill-${size}`} style={{ background: c.bg, color: c.fg }}>
      <span className="dot" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

/** Visually hidden file input wrapped in a styled label (keeps keyboard focus on the label). */
export function FilePicker({
  className,
  accept,
  multiple,
  onFiles,
  children,
}: {
  className: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <input
        type="file"
        className="file-input"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {children}
    </label>
  );
}
export const EditIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
export const ArrowToolIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19L19 5M9 5h10v10" />
  </Svg>
);
export const TextIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7V5h16v2M12 5v14M9 19h6" />
  </Svg>
);
export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </Svg>
);
export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9a5 5 0 0 0 0 10h3" />
  </Svg>
);
