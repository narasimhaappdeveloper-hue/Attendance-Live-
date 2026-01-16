'use client';

import { useState } from 'react';
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
import Image from 'next/image';
import type { AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';

export default function AttendanceLog() {
  const { attendanceRecords } = useApp();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Attendance Log</CardTitle>
          <CardDescription>Review all submitted attendance records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift & Site</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Photo</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedRecords.length > 0 ? sortedRecords.map((record) => (
                    <TableRow key={record.id}>
                    <TableCell>
                        <div className="font-medium">{record.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{record.employeeId}</div>
                    </TableCell>
                    <TableCell>
                        <div>{record.shift}</div>
                        <div className="text-sm text-muted-foreground">{record.site}</div>
                    </TableCell>
                    <TableCell>
                        <div>{format(new Date(record.dateTime), 'MMM d, yyyy')}</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(record.dateTime), 'h:mm a')}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                        <div title={record.address}>{record.address}</div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                        View
                        </Button>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No attendance records yet.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance Photo</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="relative aspect-video w-full mt-4">
              <Image src={selectedRecord.photoDataUri} alt="Attendance" layout="fill" objectFit="contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
