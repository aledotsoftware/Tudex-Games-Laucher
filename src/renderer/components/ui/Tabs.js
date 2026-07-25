import React from "react";

export const Tabs = ({ children, className = "" }) => (
  <div className={`shadcn-tabs ${className}`}>{children}</div>
);

export const TabsList = ({ children, className = "" }) => (
  <div className={`tabs-list ${className}`}>{children}</div>
);

export const TabsTrigger = ({ children, active = false, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`tabs-trigger ${active ? "active" : ""} ${className}`}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, active = false, className = "" }) => {
  if (!active) return null;
  return <div className={`tabs-content ${className}`}>{children}</div>;
};
