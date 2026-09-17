interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  skeleton?: boolean;
  skeletonRows?: number;
  columns?: number;
  className?: string;
}

const LoadingState = ({
  text = 'Loading...',
  size = 'md',
  skeleton = false,
  skeletonRows = 5,
  columns = 4,
  className = '',
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (skeleton) {
    return (
      <div className={className}>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th
                    key={i}
                    className="px-6 py-4 text-left text-sm font-semibold text-slate-700"
                  >
                    <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-t">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-4">
                      <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
    >
      <div
        className={`animate-spin rounded-full border-4 border-blue-600 border-t-transparent ${sizeClasses[size]}`}
        role="status"
        aria-live="polite"
        aria-label={text}
      >
        <span className="sr-only">{text}</span>
      </div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
};

export default LoadingState;