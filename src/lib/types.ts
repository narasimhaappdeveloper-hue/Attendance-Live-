export type Employee = {
  id: string;
  name: string;
  status: 'Approved' | 'Pending' | 'Resigned';
  phone?: string;
  weekOffDay?: string;
  
  // Professional Details
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  panNumber?: string;
  uanNumber?: string;
  bankAccountSuffix?: string;

  // Rates & Basic Settings
  dailyRate: number; 
  otRate: number;

  // Statutory Calculation Toggles
  isPFEnabled?: boolean;
  isESIEnabled?: boolean;
  isPTEnabled?: boolean;
  isITEnabled?: boolean;

  // Earnings Components (Monthly)
  basicSalary: number;
  hra: number;
  da: number;
  conveyance: number;
  specialAllowance: number;
  incentive: number;
  attendanceBonus: number;
  foodAllowance: number;
  otherEarnings: number;
  otherEarningsNote?: string;

  // Deductions Components (Monthly)
  providentFund: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  loanRecovery: number;
  advanceRecovery: number;
  otherDeductions: number;
  otherDeductionsNote?: string;
};

export type Site = {
  id: string;
  name: string;
};

export type DayStatus = 'Present' | 'Absent' | 'Week-off' | 'Leave' | 'Holiday' | 'C-off' | 'Half-Day';

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

export type ExtraStatus = {
  id: string;
  employeeId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  status: 'Leave' | 'C-off' | 'Holiday' | 'Half-Day' | 'Present' | 'Absent';
  otHours: number;
  lateHours?: number; // Tracks custom late or early-out permission hours
};

export type SalarySlip = {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  generatedDate: string;
  
  // Attendance Summary
  daysPaid: number;
  daysPresent: number;
  daysLeave: number;
  daysHoliday: number;
  daysWeekOff: number;
  daysCOff: number;
  daysAbsent: number;
  otHours: number;

  // Rates for reference
  dailyRate: number;
  otRate: number;

  // Professional Details for the slip
  designation: string;
  department: string;
  uan: string;
  pan: string;
  bankAccount: string;

  // Final Earnings Breakdown
  earnings: {
    basic: number;
    hra: number;
    da: number;
    conveyance: number;
    special: number;
    incentive: number;
    otPay: number;
    bonus: number;
    food: number;
    other: number;
    otherNote?: string;
  };

  // Final Deductions Breakdown
  deductions: {
    pf: number;
    esi: number;
    pt: number;
    it: number;
    loan: number;
    advance: number;
    lop: number;
    other: number;
    otherNote?: string;
  };

  grossEarnings: number;
  totalDeductions: number;
  totalSalary: number; // Net Pay
};

export type CurrentUser = {
  id: string;
  name: string;
  role: 'employee' | 'hr';
  phone?: string;
};
