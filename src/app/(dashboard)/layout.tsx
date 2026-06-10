import React from 'react';

/**
 * Dashboard layout group wrapper.
 * This layout is nested within the root layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
