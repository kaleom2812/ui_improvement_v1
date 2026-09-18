"use client";
import { createContext, useContext } from "react";

/**
 * True only while the hidden full-report tree is rendered for the dashboard
 * "Export" action. Sections read this to expand every collapsible and ignore
 * on-screen filters. Ported from GEO-UI-Version-5/src/dashboard/print.jsx.
 */
export const PrintContext = createContext(false);
export const usePrinting = () => useContext(PrintContext);
