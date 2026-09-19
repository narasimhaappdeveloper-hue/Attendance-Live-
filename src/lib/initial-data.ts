
import type { Employee } from './types';

export const initialEmployees: Employee[] = [
  { 
    id: 'EMP001', 
    name: 'Alice Johnson', 
    status: 'Approved', 
    phone: '9876543210', 
    weekOffDay: 'Sunday',
    designation: 'Sr. Supervisor',
    department: 'Operations',
    dailyRate: 600, 
    otRate: 150,
    basicSalary: 12000,
    hra: 4000,
    da: 2000,
    conveyance: 1500,
    specialAllowance: 1000,
    incentive: 500,
    attendanceBonus: 1000,
    foodAllowance: 2000,
    otherEarnings: 0,
    providentFund: 1800,
    esi: 450,
    professionalTax: 200,
    incomeTax: 0,
    loanRecovery: 0,
    advanceRecovery: 0,
    otherDeductions: 0
  },
  { 
    id: 'EMP004', 
    name: 'Diana Miller', 
    status: 'Approved', 
    phone: '8050166319', 
    weekOffDay: 'Sunday',
    designation: 'Field Engineer',
    department: 'Maintenance',
    dailyRate: 550, 
    otRate: 110,
    basicSalary: 10000,
    hra: 3500,
    da: 1500,
    conveyance: 1200,
    specialAllowance: 800,
    incentive: 200,
    attendanceBonus: 1100,
    foodAllowance: 2000,
    otherEarnings: 0,
    providentFund: 1500,
    esi: 350,
    professionalTax: 200,
    incomeTax: 0,
    loanRecovery: 0,
    advanceRecovery: 0,
    otherDeductions: 0
  },
];

export const hrUser = {
    id: 'ADMIN',
    name: 'admin',
}
