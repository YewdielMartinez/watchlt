import React from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return <div className="page-transition fadeIn">{children}</div>;
};

export default PageTransition;
