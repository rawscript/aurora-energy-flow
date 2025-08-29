import React from 'react';

const BatteryFull = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="1" y="6" width="18" height="12" rx="2" />
      <path d="m20 10-4.5-.5" />
      <path d="m20 14-4.5-.5" />
      <path d="m20 18-4.5-.5" />
      <path d="M3 10h6" />
      <path d="M3 14h6" />
      <path d="M3 18h6" />
    </svg>
  );
};

export default BatteryFull;