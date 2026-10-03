export type AppointmentStatus = "pending" | "progress" | "done";

export type Appointment = {
  id: number;
  time: string;
  name: string;
  service: string;
  duration: string;
  notes: string;
  status: AppointmentStatus;
};

export const statusCopy: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  progress: "En proceso",
  done: "Finalizado",
};
