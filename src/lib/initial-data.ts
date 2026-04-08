import type { Employee } from './types';

export const initialEmployees: Employee[] = [
  { id: 'EMP001', name: 'Alice Johnson', status: 'Approved', phone: '9876543210' },
  { id: 'EMP002', name: 'Bob Williams', status: 'Approved', phone: '8765432109' },
  { id: 'EMP003', name: 'Charlie Brown', status: 'Pending', phone: '7654321098' },
  { id: 'EMP004', name: 'Diana Miller', status: 'Approved', phone: '8050166319' },
];

export const hrUser = {
    id: 'HR-001',
    name: 'Admin',
}
