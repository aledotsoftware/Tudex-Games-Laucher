import React from "react";

export const Button = ({
  children,
  variant = "primary",
  disabled = false,
  onClick,
  type = "button",
  className = "",
  style = {}
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`shadcn-btn btn-${variant} ${className}`}
    style={style}
  >
    {children}
  </button>
);
