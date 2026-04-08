
export type Employee = {
  id: string;
  name: string;
  status: 'Approved' | 'Pending';
  phone?: string;
};

export type Site = {
  id: string;
  name: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: 'Shift A' | 'Shift B' | 'Shift C' | 'General';
  site: string;
  dateTime: string;
  gpsCoordinates: { lat: number; lng: number };
  address: string;
  photoDataUri: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  role: 'employee' | 'hr';
  phone?: string;
};
