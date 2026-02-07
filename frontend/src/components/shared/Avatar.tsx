const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-20 h-20',
};

const getAvatarUrl = (name: string, size = 64) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random&size=${size}`;

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/** Avatar with default icon fallback. Uses ui-avatars.com when no src or on load error. */
export const Avatar = ({ src, name, size = 'md', className = '' }: AvatarProps) => {
  const sizeClass = sizeClasses[size];
  const pixelSize = size === 'sm' ? 48 : size === 'md' ? 64 : size === 'lg' ? 80 : 160;
  const defaultSrc = getAvatarUrl(name, pixelSize);

  return (
    <img
      src={src && src.startsWith('http') ? src : defaultSrc}
      alt={name}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultSrc;
      }}
    />
  );
};
