export type Employee = {
  id: string;
  name: string;
  status: 'Approved' | 'Pending';
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  site: 'Main Office' | 'Warehouse' | 'Remote';
  dateTime: string;
  gpsCoordinates: { lat: number; lng: number };
  address: string;
  photoDataUri: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  role: 'employee' | 'hr';
};
