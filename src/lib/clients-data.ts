export type Client = {
  id: number;
  name: string;
  phone: string; // formato internacional sin "+", para wa.me
  daysSinceLastCut: number;
  notes: string;
  visits: number; // visitas dentro del ciclo de fidelidad (0-5)
};

export const LOYALTY_GOAL = 5;
export const REMINDER_DAYS = 31;

export const clients: Client[] = [
  { id: 1, name: "Martín Acosta", phone: "5491112345001", daysSinceLastCut: 34, notes: "Laterales a máquina 2. Mantener largo arriba.", visits: 4 },
  { id: 2, name: "Lucas Benítez", phone: "5491112345002", daysSinceLastCut: 12, notes: "Degradé bajo y barba corta, terminación natural.", visits: 2 },
  { id: 3, name: "Tomás Silva", phone: "5491112345003", daysSinceLastCut: 31, notes: "Perfilar contorno y rebajar volumen en mentón.", visits: 5 },
  { id: 4, name: "Nicolás Rojas", phone: "5491112345004", daysSinceLastCut: 8, notes: "Fade medio, sin tocar demasiado el flequillo.", visits: 1 },
  { id: 5, name: "Joaquín Torres", phone: "5491112345005", daysSinceLastCut: 40, notes: "Primera visita. Consultar estilo antes de comenzar.", visits: 3 },
];

// Llamar solo desde render/handlers, nunca a nivel de módulo.
export function lastCutDate(daysSince: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysSince);
  return d;
}

export function formatLastCut(daysSince: number): string {
  return lastCutDate(daysSince).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function whatsappUrl(client: Client): string {
  const message = `¡Hola ${client.name}! Ya pasaron 31 días desde tu último corte. ¿Agendamos para esta semana?`;
  return `https://wa.me/${client.phone}?text=${encodeURIComponent(message)}`;
}
