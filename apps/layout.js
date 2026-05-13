import React from "react";
import { Toaster } from "sonner";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen"> 
      <Toaster position="top-right" richColors />
      {children}
    </div>
  );
}
