import MainLayout from "@/components/layout/main-layout";
import HrDashboard from "@/components/hr-dashboard";

export default function HrDashboardPage() {
  return (
    <MainLayout allowedRoles={['hr']}>
      <div className="container mx-auto p-4 md:p-8">
        <HrDashboard />
      </div>
    </MainLayout>
  );
}
