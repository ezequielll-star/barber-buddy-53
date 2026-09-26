# Acceso del barbero + reservas públicas

## Qué vas a ver
- **Pantalla de PIN** (`/ingresar`): teclado numérico grande. La clave por defecto es 1234. Sin la clave no se pueden abrir Hoy, Clientes, Caja ni Ajustes. En Ajustes vas a tener un botón "Cerrar sesión".
- **Página pública de reservas** (`/reservar`), sin clave, en 3 pasos:
  1. Elegir el servicio, con precio y duración.
  2. Elegir la fecha: los próximos 14 días, con los domingos cerrados.
  3. Elegir el horario: turnos de 09:00 a 19:00. Los horarios que ya están tomados figuran como "No disponible", sin nombres ni datos de nadie.
  Después, el cliente escribe su nombre y WhatsApp, confirma y ve un mensaje de reserva confirmada.
- **Panel del barbero**: las reservas nuevas aparecen solas en la agenda de Hoy, con la etiqueta "Reserva online".

## Detalles técnicos
- Activar Lovable Cloud y crear una tabla `bookings` (servicio, fecha, hora, nombre, whatsapp, estado) con restricción única por fecha y hora.
- Los clientes no tienen acceso directo a la tabla. Todo pasa por funciones del servidor:
  - `getAvailability(fecha)` devuelve solo los horarios ocupados, sin datos personales.
  - `createBooking` valida los datos con zod y rechaza un horario que ya esté tomado.
  - `listBookings` y `updateBooking` exigen la sesión del barbero.
- El PIN se guarda como secreto del servidor, `BARBER_PIN=1234`. Se compara de forma segura contra ataques de tiempo y la sesión va en una cookie cifrada (`SESSION_SECRET`).
- Las rutas privadas se mueven a un layout `_barbero` que redirige a `/ingresar` cuando no hay sesión. Las URLs de siempre (/, /clientes, /caja, /ajustes) no cambian.
- Hoy combina los turnos de muestra con las reservas guardadas.
