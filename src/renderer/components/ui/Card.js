import React from "react";

export const Card = ({ children, className = "", style = {} }) => (
  <div className={`shadcn-card ${className}`} style={style}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }) => (
  <div className={`card-header ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = "" }) => (
  <h3 className={`card-title ${className}`}>{children}</h3>
);

export const CardDescription = ({ children, className = "" }) => (
  <p className={`card-description ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`card-content ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = "" }) => (
  <div className={`card-footer ${className}`}>{children}</div>
);
