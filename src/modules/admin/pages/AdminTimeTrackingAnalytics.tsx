import React from 'react';
import { TimeTrackingAnalytics } from '@/modules/admin/components/TimeTrackingAnalytics';
import { AdminLayout } from '@/modules/admin/layouts/AdminLayout';

export default function AdminTimeTrackingAnalytics() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <TimeTrackingAnalytics />
      </div>
    </AdminLayout>
  );
}