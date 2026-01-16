import type { Employee } from './types';

export const initialEmployees: Employee[] = [
  { id: 'EMP001', name: 'Alice Johnson', status: 'Approved' },
  { id: 'EMP002', name: 'Bob Williams', status: 'Approved' },
  { id: 'EMP003', name: 'Charlie Brown', status: 'Pending' },
  { id: 'EMP004', name: 'Diana Miller', status: 'Approved' },
];

export const hrUser = {
    id: 'HR-001',
    name: 'Admin',
}
