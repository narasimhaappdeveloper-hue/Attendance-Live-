import MainLayout from "@/components/layout/main-layout";
import EmployeeDashboard from "@/components/employee-dashboard";

export default function EmployeeDashboardPage() {
  return (
    <MainLayout allowedRoles={['employee']}>
      <div className="max-w-[1800px] mx-auto p-4 md:p-8 w-full">
        <EmployeeDashboard />
      </div>
    </MainLayout>
  );
}
