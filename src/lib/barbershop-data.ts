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

export const appointments: Appointment[] = [
  { id: 1, time: "09:00", name: "Martín Acosta", service: "Corte clásico", duration: "45 min", notes: "Laterales a máquina 2. Mantener largo arriba.", status: "done" },
  { id: 2, time: "10:00", name: "Lucas Benítez", service: "Corte + barba", duration: "60 min", notes: "Degradé bajo y barba corta, terminación natural.", status: "progress" },
  { id: 3, time: "11:30", name: "Tomás Silva", service: "Perfilado de barba", duration: "30 min", notes: "Perfilar contorno y rebajar volumen en mentón.", status: "pending" },
  { id: 4, time: "13:00", name: "Nicolás Rojas", service: "Corte degradé", duration: "45 min", notes: "Fade medio, sin tocar demasiado el flequillo.", status: "pending" },
  { id: 5, time: "15:30", name: "Joaquín Torres", service: "Corte + barba", duration: "60 min", notes: "Primera visita. Consultar estilo antes de comenzar.", status: "pending" },
];

export const statusCopy: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  progress: "En proceso",
  done: "Finalizado",
};