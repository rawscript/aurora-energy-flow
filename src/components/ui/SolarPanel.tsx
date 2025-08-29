import React from 'react';

const SolarPanel = ({ className }: { className?: string }) => {
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
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M5 8h14M5 12h14M5 16h14" />
    </svg>
  );
};

export default SolarPanel;