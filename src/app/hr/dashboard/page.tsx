import MainLayout from "@/components/layout/main-layout";
import HrDashboard from "@/components/hr-dashboard";

export default function HrDashboardPage() {
  return (
    <MainLayout allowedRoles={['hr']}>
      <div className="max-w-[1800px] mx-auto p-4 md:p-8 w-full">
        <HrDashboard />
      </div>
    </MainLayout>
  );
}
