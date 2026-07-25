import React from "react";

export const Badge = ({ children, variant = "default", className = "", pulse = false }) => (
  <span className={`shadcn-badge variant-${variant} ${className}`}>
    {pulse && <span className="pulse-dot" />}
    {children}
  </span>
);
