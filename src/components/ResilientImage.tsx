import { useState } from 'react';
import { Package } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function ResilientImage({ src, alt, className = '', eager = false }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EBE6DC] text-[#5C5B57] p-4 text-center ${className}`}
        aria-label={alt}
      >
        <Package className="w-7 h-7 stroke-[1.25] text-[#B89352] mb-2" />
        <span className="text-xs font-medium line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
