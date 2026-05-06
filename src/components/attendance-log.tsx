'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/use-app';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Image from 'next/image';
import type { AttendanceRecord } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { Download, Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AttendanceLog() {
  const { attendanceRecords, sites } = useApp();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Filtered Logic
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            record.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !filterDate || isSameDay(new Date(record.dateTime), filterDate);
      const matchesSite = filterSite === 'all' || record.site === filterSite;
      const matchesShift = filterShift === 'all' || record.shift === filterShift;
      
      return matchesSearch && matchesDate && matchesSite && matchesShift;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [attendanceRecords, searchQuery, filterDate, filterSite, filterShift]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterDate(undefined);
    setFilterSite('all');
    setFilterShift('all');
  };

  const downloadCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Employee Name', 'Employee ID', 'Shift', 'Site', 'Date', 'Time', 'Address', 'GPS'];
    const csvRows = filteredRecords.map(record => [
      record.employeeName,
      record.employeeId,
      record.shift,
      record.site,
      format(new Date(record.dateTime), 'yyyy-MM-dd'),
      format(new Date(record.dateTime), 'HH:mm:ss'),
      `"${record.address.replace(/"/g, '""')}"`,
      `${record.gpsCoordinates.lat},${record.gpsCoordinates.lng}`
    ]);

    const csvContent = [headers, ...csvRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <div>
            <CardTitle>Attendance Log</CardTitle>
            <CardDescription>Review and export employee attendance records.</CardDescription>
          </div>
          <Button 
            variant="outline" 
            className="bg-green-600 text-white hover:bg-green-700 hover:text-white"
            onClick={downloadCSV}
            disabled={filteredRecords.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={filterSite} onValueChange={setFilterSite}>
              <SelectTrigger>
                <SelectValue placeholder="Select Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger>
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="Shift A">Shift A</SelectItem>
                <SelectItem value="Shift B">Shift B</SelectItem>
                <SelectItem value="Shift C">Shift C</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" onClick={resetFilters} className="text-muted-foreground">
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift & Site</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Photo</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                    <TableCell>
                        <div className="font-medium">{record.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{record.employeeId}</div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm font-medium">{record.shift}</div>
                        <div className="text-xs text-muted-foreground">{record.site}</div>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">{format(new Date(record.dateTime), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(record.dateTime), 'h:mm a')}</div>
                    </TableCell>
                    <TableCell className="max-w-[150px] lg:max-w-[250px]">
                        <div className="text-xs line-clamp-2" title={record.address}>{record.address}</div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                        View
                        </Button>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            No records matching your filters.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Showing {filteredRecords.length} of {attendanceRecords.length} total records.
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verification Photo</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border shadow-inner bg-black">
                <Image 
                  src={selectedRecord.photoDataUri} 
                  alt="Attendance Verification" 
                  layout="fill" 
                  objectFit="contain" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-bold text-xs uppercase text-muted-foreground">Employee</p>
                  <p>{selectedRecord.employeeName} ({selectedRecord.employeeId})</p>
                </div>
                <div>
                  <p className="font-bold text-xs uppercase text-muted-foreground">Location</p>
                  <p className="text-xs">{selectedRecord.address}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
