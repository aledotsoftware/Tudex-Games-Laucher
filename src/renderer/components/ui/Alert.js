import React from "react";

export const Alert = ({ title, description, variant = "info", icon, className = "" }) => (
  <div className={`shadcn-alert alert-${variant} ${className}`}>
    {icon && <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{icon}</span>}
    <div>
      {title && <h4 className="alert-title">{title}</h4>}
      {description && <p className="alert-description">{description}</p>}
    </div>
  </div>
);
