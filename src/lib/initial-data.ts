
import type { Employee } from './types';

export const initialEmployees: Employee[] = [
  { id: 'EMP001', name: 'Alice Johnson', status: 'Approved', phone: '9876543210', weekOffDay: 'Sunday', dailyRate: 500, otRate: 100 },
  { id: 'EMP002', name: 'Bob Williams', status: 'Approved', phone: '8765432109', weekOffDay: 'Sunday', dailyRate: 600, otRate: 120 },
  { id: 'EMP003', name: 'Charlie Brown', status: 'Pending', phone: '7654321098', weekOffDay: 'Sunday', dailyRate: 450, otRate: 90 },
  { id: 'EMP004', name: 'Diana Miller', status: 'Approved', phone: '8050166319', weekOffDay: 'Sunday', dailyRate: 550, otRate: 110 },
];

export const hrUser = {
    id: 'ADMIN',
    name: 'admin',
}
