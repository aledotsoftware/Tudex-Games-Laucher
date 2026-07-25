import React from "react";

export const Progress = ({ value = 0, indeterminate = false, className = "" }) => (
  <div className={`shadcn-progress ${indeterminate ? "indeterminate" : ""} ${className}`}>
    <div className="progress-fill" style={{ width: indeterminate ? "50%" : `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);
