
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '@/hooks/use-app';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const addEmployeeSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  id: z.string().min(3, { message: 'ID is required.' }),
  phone: z.string().min(10, { message: 'Phone must be at least 10 digits.' }),
  weekOffDay: z.string().min(1, { message: 'Please select a week-off day.' }),
});

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EmployeeManagement() {
  const { employees, addEmployee, updateEmployeeStatus, deleteEmployee } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'Resigned'), [employees]);
  const resignedEmployees = useMemo(() => employees.filter(e => e.status === 'Resigned'), [employees]);

  const form = useForm<z.infer<typeof addEmployeeSchema>>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      name: '',
      id: '',
      phone: '',
      weekOffDay: 'Sunday',
    },
  });

  const handleAddEmployee = (values: z.infer<typeof addEmployeeSchema>) => {
    const isDuplicate = employees.some(emp => emp.id.toUpperCase() === values.id.toUpperCase());
    
    if (isDuplicate) {
        toast({ 
            variant: 'destructive', 
            title: 'Duplicate Creation Blocked', 
            description: 'ఈ ఎంప్లాయీ ఐడి ఇప్పటికే ఉంది. దయచేసి వేరే ఐడిని ఇవ్వండి.' 
        });
        return;
    }

    addEmployee({
      name: values.name, 
      id: values.id.toUpperCase(), 
      phone: values.phone,
      weekOffDay: values.weekOffDay,
      dailyRate: 0,
      otRate: 0,
      attendanceBonus: 0,
      foodAllowance: 0,
      deductions: 0,
      basicSalary: 0,
      hra: 0,
      da: 0,
      conveyance: 0,
      specialAllowance: 0,
      incentive: 0,
      otherEarnings: 0,
      providentFund: 0,
      esi: 0,
      professionalTax: 0,
      incomeTax: 0,
      loanRecovery: 0,
      advanceRecovery: 0,
      otherDeductions: 0
    });
    toast({ title: 'Success', description: 'కొత్త ఉద్యోగి విజయవంతంగా చేర్చబడ్డారు.' });
    form.reset();
    setIsAddDialogOpen(false);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <CardTitle>Manage Employees</CardTitle>
            <CardDescription>Add, remove, or update employee information.</CardDescription>
        </div>
        <div className="flex gap-2">
            <div className="hidden lg:flex items-center gap-2 p-2 bg-amber-50 text-amber-800 text-[10px] rounded-lg border border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                <span>"Resign" హిస్టరీని కాపాడుతుంది. "Delete" అటెండెన్స్ మొత్తం డిలీట్ చేస్తుంది.</span>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({activeEmployees.length})</TabsTrigger>
            <TabsTrigger value="resigned">Resigned ({resignedEmployees.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.length > 0 ? activeEmployees.map((employee) => (
                  <TableRow key={`emp-row-${employee.id.toUpperCase()}`}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.id.toUpperCase()}</TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={employee.status}
                        onValueChange={(value: 'Approved' | 'Pending' | 'Resigned') =>
                          updateEmployeeStatus(employee.id, value)
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Approved">
                            <Badge className="bg-green-500 hover:bg-green-600 border-none">Approved</Badge>
                          </SelectItem>
                          <SelectItem value="Pending">
                            <Badge variant="secondary">Pending</Badge>
                          </SelectItem>
                          <SelectItem value="Resigned">
                            <Badge variant="destructive">Resigned</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Mark as Resigned"
                            onClick={() => updateEmployeeStatus(employee.id, 'Resigned')}
                        >
                            <UserX className="h-4 w-4 text-amber-600" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Permanently Delete">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>ఖచ్చితంగా డిలీట్ చేయాలా?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    ఈ యాక్షన్ వల్ల ఎంప్లాయీతో పాటు వారి పాత అటెండెన్స్ హిస్టరీ కూడా డిలీట్ అవుతుంది. హిస్టరీ కావాలంటే కేవలం "Resigned" స్టేటస్‌కి మార్చండి.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteEmployee(employee.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete Anyway
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No active employees found.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="resigned">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Re-hire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resignedEmployees.length > 0 ? resignedEmployees.map((employee) => (
                  <TableRow key={`res-row-${employee.id.toUpperCase()}`}>
                    <TableCell className="font-medium text-muted-foreground">{employee.name}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.id.toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Resigned</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => updateEmployeeStatus(employee.id, 'Approved')}
                        >
                            <UserCheck className="mr-2 h-4 w-4" /> Activate
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No resigned employees found.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter the details for the new employee.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddEmployee)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP005" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weekOffDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week Off Day</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
