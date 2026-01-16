import MainLayout from "@/components/layout/main-layout";
import EmployeeDashboard from "@/components/employee-dashboard";

export default function EmployeeDashboardPage() {
  return (
    <MainLayout allowedRoles={['employee']}>
      <div className="container mx-auto p-4 md:p-8">
        <EmployeeDashboard />
      </div>
    </MainLayout>
  );
}
