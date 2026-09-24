# Navegación e interacción móvil

## Objetivo
Convertir la barra inferior en navegación real y permitir consultar los detalles de turnos y del calendario sin perder el estilo actual.

## Cambios
- Crear vistas separadas para **Hoy**, **Clientes**, **Caja** y **Ajustes**, manteniendo la barra inferior fija y resaltando la sección activa.
- Usar la navegación de la aplicación para cambiar de pantalla al tocar cada opción.
- Hacer tocable cada turno y abrir un panel inferior con cliente, servicio, duración, notas y estado.
- Hacer funcional el botón de calendario y mostrar un panel con la fecha y los turnos del día.
- Mantener el cambio rápido de estado del turno sin que interfiera con la apertura de detalles.
- Conservar el diseño oscuro, los controles grandes y la experiencia mobile-first.

## Validación
- Probar las cuatro opciones de navegación en móvil.
- Probar apertura y cierre de detalles desde un turno y desde el calendario.
- Confirmar el indicador activo y verificar que la aplicación no tenga errores visibles.
