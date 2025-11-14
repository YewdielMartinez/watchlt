# Componente Alert

Componente de alerta/modal reutilizable con diseño moderno tipo glass.

## Características

- 🎨 Diseño glass moderno con efectos de blur
- 🎭 5 tipos de alertas: success, error, warning, info, confirm
- 🎯 Iconos animados de Heroicons
- ⚡ Animaciones suaves (fadeIn, scaleIn)
- 📱 Responsive y accesible
- 🔄 Reutilizable en toda la aplicación

## Props

```typescript
interface AlertProps {
  isOpen: boolean; // Controla si la alerta está visible
  onClose: () => void; // Función para cerrar la alerta
  onConfirm?: () => void; // Función opcional para confirmación (solo type="confirm")
  title: string; // Título de la alerta
  message: string; // Mensaje de la alerta
  type?: "success" | "error" | "warning" | "info" | "confirm"; // Tipo de alerta (default: "info")
  confirmText?: string; // Texto del botón de confirmación (default: "Aceptar")
  cancelText?: string; // Texto del botón de cancelar (default: "Cancelar")
}
```

## Ejemplos de uso

### 1. Alerta de Éxito

```tsx
import Alert from "../shared/Alert";

const [showSuccess, setShowSuccess] = useState(false);

// En el JSX:
<Alert
  isOpen={showSuccess}
  onClose={() => setShowSuccess(false)}
  title="¡Operación exitosa!"
  message="La película se guardó correctamente en tu lista."
  type="success"
  confirmText="Entendido"
/>;
```

### 2. Alerta de Error

```tsx
<Alert
  isOpen={showError}
  onClose={() => setShowError(false)}
  title="Error al cargar"
  message="No se pudo conectar con el servidor. Por favor, intenta de nuevo."
  type="error"
  confirmText="Reintentar"
/>
```

### 3. Alerta de Confirmación (con dos botones)

```tsx
<Alert
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={() => {
    // Acción a realizar al confirmar
    deleteMovie();
  }}
  title="¿Estás seguro?"
  message="Esta acción no se puede deshacer. ¿Deseas continuar?"
  type="confirm"
  confirmText="Sí, eliminar"
  cancelText="No, cancelar"
/>
```

### 4. Alerta de Advertencia

```tsx
<Alert
  isOpen={showWarning}
  onClose={() => setShowWarning(false)}
  title="Atención"
  message="Esta película contiene contenido para mayores de 18 años."
  type="warning"
  confirmText="He leído"
/>
```

### 5. Alerta Informativa

```tsx
<Alert
  isOpen={showInfo}
  onClose={() => setShowInfo(false)}
  title="Información"
  message="Las comparaciones se guardan automáticamente en tu navegador."
  type="info"
  confirmText="De acuerdo"
/>
```

## Tipos de Alertas

### Success (Verde)

- ✅ Operaciones exitosas
- 💾 Guardado completado
- ✔️ Confirmaciones positivas

### Error (Rojo)

- ❌ Errores de servidor
- 🚫 Operaciones fallidas
- ⚠️ Problemas críticos

### Warning (Amarillo)

- ⚡ Advertencias importantes
- 📢 Notificaciones de atención
- 🔔 Alertas preventivas

### Info (Azul)

- ℹ️ Información general
- 📖 Ayuda contextual
- 💡 Tips y consejos

### Confirm (Accent)

- 🤔 Confirmaciones de acciones
- ❓ Preguntas al usuario
- 🔄 Acciones que requieren decisión

## Personalización

Los colores y estilos están definidos en la función `getColorClasses()`:

- Success: `border-green-500/30` con gradiente verde
- Error: `border-red-500/30` con gradiente rojo
- Warning: `border-yellow-500/30` con gradiente amarillo
- Confirm: `border-accent/30` con gradiente accent
- Info: `border-blue-500/30` con gradiente azul

## Animaciones

El componente incluye dos animaciones principales:

1. **fadeIn**: Para el overlay de fondo (0.2s)
2. **scaleIn**: Para el modal (0.3s con efecto bounce)

Las animaciones están definidas en `index.css`:

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Accesibilidad

- ✅ Botón de cerrar con `aria-label`
- ✅ Click fuera del modal cierra la alerta
- ✅ Iconos descriptivos para cada tipo
- ✅ Contraste adecuado en textos
- ✅ Animaciones suaves sin mareo

## Notas de Implementación

- El componente se renderiza en un portal con `z-50` para estar siempre encima
- El backdrop tiene `backdrop-blur-sm` para efecto glass
- El modal previene propagación de clicks para evitar cierre accidental
- Compatible con el sistema de diseño glass de la aplicación
