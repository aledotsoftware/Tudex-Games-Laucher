import React from "react";

export const Table = ({ children, className = "" }) => (
  <table className={`shadcn-table ${className}`}>{children}</table>
);

export const TableHeader = ({ children }) => <thead>{children}</thead>;
export const TableBody = ({ children }) => <tbody>{children}</tbody>;
export const TableRow = ({ children }) => <tr>{children}</tr>;
export const TableHead = ({ children }) => <th>{children}</th>;
export const TableCell = ({ children, className = "" }) => (
  <td className={className}>{children}</td>
);
