# Proyecto Pomodoro "La Chancluda" productivity-app

Esta es una aplicación de escritorio de productividad y control de tiempo, construida con Tauri (Rust + React), que te ayuda a mantenerte enfocado.

El concepto es simple: un temporizador Pomodoro de 25 minutos.
* Si la aplicación detecta que estás trabajando (moviendo el mouse, escribiendo), te enviará notificaciones motivacionales.
* Si la aplicación detecta que estás inactivo por más de 5 segundos, te recordará que debes concentrarte... al estilo "Chancluda".

!(public/chancluda.jpg)

---

## ✨ Características Principales

* **Temporizador Pomodoro:** Ciclos de 25 minutos de enfoque seguidos de 5 minutos de descanso.
* **Detección de Actividad Global:** El backend de Rust monitorea el mouse y el teclado *en todo el sistema operativo*, no solo dentro de la aplicación.
* **Toasts Aleatorios:** Las notificaciones (toasts) aparecen en una de las 8 posiciones aleatorias de la pantalla (esquinas y laterales) para no ser predecibles.
* **Notificaciones Contextuales:**
    * **Motivación:** Si te mantienes activo, recibirás un mensaje de apoyo (con `love.jpg`).
    * **Advertencia:** Si te detecta inactivo, recibirás un recordatorio "amable" de volver al trabajo (con `sandalia.jpg`).
    * **Descanso:** Notificación al final del ciclo para recordarte que tomes un descanso.
* **Dashboard de Estadísticas:** La ventana principal muestra contadores de cuántas veces te has mantenido concentrado vs. cuántas veces te has distraído.
* **Gráfica de Actividad:** Una gráfica de barras muestra tu historial de concentración e inactividad de los últimos 7 días.
* **Persistencia de Datos:** Las estadísticas se guardan localmente en el disco (`stats.dat`) para que no se pierdan al cerrar la app.

---

## 🛠️ Tech Stack (Tecnologías Usadas)

* **Core:** [Tauri](https://tauri.app/)
* **Backend (Lógica Principal):** [Rust](https://www.rust-lang.org/)
    * `rdev`: Para la escucha de eventos globales de mouse y teclado.
    * `tauri-plugin-store`: Para guardar las estadísticas en el disco.
    * `chrono`: Para manejar las fechas de las estadísticas.
* **Frontend (UI):** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
    * `Vite`: Como herramienta de construcción (configurado para *multi-página*).
    * `Chart.js`: Para renderizar la gráfica de estadísticas.

---

## 🏗️ Arquitectura del Proyecto

Este proyecto tiene una arquitectura de **dos ventanas** para lograr el efecto de "toast" a nivel de sistema operativo:

1.  **Ventana `main` (El Dashboard)**
    * **Propósito:** Es la ventana principal que el usuario ve.
    * **UI:** Renderiza el componente `src/App.tsx`.
    * **Función:** Muestra el temporizador, los botones de control (Iniciar/Pausar) y la gráfica de `Chart.js`. Se comunica con Rust para enviar comandos (`invoke`) y recibir actualizaciones (`listen`).

2.  **Ventana `toast` (La Notificación)**
    * **Propósito:** Es una ventana invisible, sin bordes, sin barra de título y transparente.
    * **UI:** Renderiza un componente separado `src/toast.tsx`.
    * **Función:** Pasa el 99% del tiempo oculta (`visible: false`). Su único trabajo es escuchar el evento `show-toast` enviado desde Rust. Cuando lo recibe:
        1.  Rust le envía el tipo de toast ("angry", "motivation") y el mensaje.
        2.  El frontend calcula una posición aleatoria en la pantalla.
        3.  Mueve su propia ventana a esa posición.
        4.  Se muestra a sí misma (`appWindow.show()`).
        5.  Después de 4 segundos, se vuelve a ocultar (`appWindow.hide()`).

### Flujo de Datos (Backend)

* La lógica principal vive en `src-tauri/src/main.rs`.
* Un hilo (`start_activity_listener`) usa `rdev` para escuchar la actividad global y resetear un contador de inactividad.
* Otro hilo (`start_timer_thread`) corre cada segundo, manejando el temporizador Pomodoro y el contador de inactividad.
* Si el contador de inactividad supera los 5 segundos, Rust emite el evento `show-toast` (angry) a **ambas** ventanas. La ventana `toast` es la única que reacciona a él.
* Los datos de la gráfica se guardan en `stats.dat` usando `tauri-plugin-store` y se leen con el comando `get_daily_stats`.

---

## 🚀 Cómo Ejecutar el Proyecto

### Prerrequisitos

Asegúrate de tener instalado [Rust y las dependencias de sistema de Tauri](https://tauri.app/v1/guides/getting-started/prerequisites). También necesitas [Node.js](https://nodejs.org/).

1.  **Clonar el repositorio (si aplica)**
    ```bash
    git clone ...
    cd tu-proyecto
    ```

2.  **Instalar dependencias de Node.js**
    ```bash
    npm install
    ```

3.  **Instalar dependencias de Frontend (React)**
    * `npm install chart.js`

4.  **Ejecutar en modo de desarrollo**
    ```bash
    npm run tauri dev
    ```

    La primera vez, Rust tardará varios minutos en compilar todas las `crates` (dependencias). Las siguientes veces será casi instantáneo.

## 📁 Archivos Clave del Proyecto

 ├── src/ # Código Frontend (React) │ ├── App.tsx # Componente React para la ventana principal (Dashboard) │ ├── main.tsx # Punto de entrada para la ventana 'main' │ └── toast.tsx # Componente React para la ventana de 'toast' │ ├── src-tauri/ # Código Backend (Rust) │ ├── Cargo.toml # Dependencias de Rust (rdev, tauri-plugin-store, etc.) │ └── src/ │ └── main.rs # El "cerebro" de la aplicación (toda la lógica de timers y eventos) │ ├── public/ # Imágenes estáticas │ ├── sandalia.jpg │ ├── love.jpg │ └── chancluda.jpg │ ├── index.html # HTML de entrada para la ventana 'main' ├── toast.html # HTML de entrada para la ventana 'toast' ├── tauri.conf.json # Configuración de Tauri (definición de las 2 ventanas) └── vite.config.ts # Configuración de Vite (compilación multi-página)


 ## 🧠 Lógica Detallada del Backend (Rust)

El núcleo de la aplicación reside en `src-tauri/src/main.rs` y se puede dividir en varios componentes clave:

1.  **Estado Global (`GLOBAL_STATE`):** Se utiliza una estructura `GlobalAppState` envuelta en un `Mutex` y un `Arc` para compartir de forma segura el estado de la aplicación (si está en modo `Focus`, `Break` o `Idle`), el tiempo restante del temporizador y las estadísticas de la sesión actual entre diferentes hilos.

2.  **Listener de Actividad (`start_activity_listener`):**
    * Corre en un hilo separado para no bloquear la aplicación principal.
    * Utiliza la crate `rdev` para capturar eventos de bajo nivel del sistema operativo (movimiento del mouse, clics, pulsaciones de teclas).
    * Cuando detecta actividad, resetea un contador `inactivity_seconds` en el estado global.
    * Si el usuario vuelve a estar activo después de un período de inactividad, emite un toast de motivación.

3.  **Temporizador Principal (`start_timer_thread`):**
    * También corre en un hilo separado.
    * Cada segundo, verifica el estado actual de la aplicación.
    * Si está en modo `Focus` o `Break`, decrementa el temporizador principal y emite el evento `timer-tick` al frontend.
    * Si está en modo `Focus`, también incrementa el contador `inactivity_seconds`. Si este contador alcanza el límite de 5 segundos, emite un toast de advertencia ("angry").
    * Cuando el temporizador llega a cero, cambia el estado (de `Focus` a `Break`, o de `Break` a `Idle`), guarda las estadísticas de la sesión y emite el toast correspondiente.

4.  **Persistencia de Datos (`save_stats_to_disk` y `get_daily_stats`):**
    * Utiliza el plugin `tauri-plugin-store` para crear y gestionar un archivo local (`stats.dat`).
    * Las estadísticas se guardan en formato JSON, usando la fecha actual (ej. `"2025-10-24"`) como clave.
    * `save_stats_to_disk` se llama al final de cada ciclo de Pomodoro para sumar los contadores de la sesión a los totales del día.
    * `get_daily_stats` es un comando que el frontend puede invocar para leer los datos de los últimos 7 días y construir la gráfica.

---

## 💡 Posibles Mejoras y Siguientes Pasos

Este proyecto tiene una base sólida, pero podría expandirse con nuevas funcionalidades:

* **Configuración de Tiempos:** Permitir al usuario configurar la duración de los ciclos de Pomodoro y los descansos.
* **Sonidos de Notificación:** Añadir sonidos a los toasts para que sean más notorios.
* **Modo "No Molestar":** Integrar con APIs del sistema operativo para silenciar notificaciones de otras aplicaciones durante el ciclo de enfoque.
* **Listas de Tareas (To-Do List):** Integrar una pequeña lista de tareas en el dashboard principal para asociar los ciclos de Pomodoro a tareas específicas.
* **Reportes Avanzados:** Crear una vista de reportes más detallada, con filtros por fecha y exportación de datos.
* **Icono en la Bandeja del Sistema (Tray Icon):** Añadir un icono en la bandeja del sistema para controlar la aplicación (iniciar/pausar/salir) sin tener que abrir la ventana principal.

---

## � Cambios Realizados en Esta Sesión (24/10/2025)

### ✅ Frontend (React + TypeScript)

#### 1. **Mejorado Toast.tsx** (`src/components/Toast.tsx`)
   - Añadido soporte para diferentes tipos de toasts: "angry", "motivation", "break"
   - Mejorada la integración de eventos desde Rust
   - Importación de estilos CSS dedicados

#### 2. **Nuevo archivo Toast.css** (`src/components/Toast.css`)
   - Estilos modernos con gradientes y animaciones suaves
   - Animaciones específicas por tipo de toast:
     - **Angry**: Animación de `shake` con gradiente rojo
     - **Motivation**: Animación de `heartBeat` con gradiente azul
     - **Break**: Gradiente verde para descansos
   - Diseño responsivo para diferentes tamaños de pantalla

#### 3. **Completamente rediseñado App.tsx** (`src/App.tsx`)
   - Nuevo estado `currentState` para mostrar estado actual (Focus/Break/Idle)
   - Integración con `storeManager` para persistencia de datos
   - Nuevo event listener para `state-changed` desde Rust
   - Nuevo event listener para `update-daily-stats` para guardar estadísticas diarias
   - Interface `UpdateDailyStatsPayload` para tipado correcto
   - Pantalla de carga mientras se inicializa el store
   - Mejor manejo de errores

#### 4. **Completamente rediseñado App.css** (`src/App.css`)
   - Diseño moderno con gradientes de fondo (morado)
   - Secciones claramente definidas:
     - **Header**: Título y subtítulo con estilos elegantes
     - **Timer Section**: Display grande del timer con estado visual
     - **Stats Section**: Tarjetas de estadísticas con iconos y colores diferenciados
     - **Chart Section**: Gráfica semanal mejorada
   - Transiciones y animaciones suaves
   - Completamente responsivo (mobile, tablet, desktop)
   - Botones con hover effects y feedback visual

#### 5. **Nuevo archivo toast.tsx** (`src/toast.tsx`)
   - Punto de entrada para la ventana de toast
   - Renderiza el componente `Toast` en el DOM

#### 6. **Nuevo archivo toast.html** (`toast.html`)
   - HTML de entrada para la ventana de toast
   - Scripts de módulo que apuntan a `src/toast.tsx`

#### 7. **Mejorado storeManager.ts** (`src/utils/storeManager.ts`)
   - Corrección del constructor de `Store` usando `Store.load()` en lugar del constructor privado
   - Métodos para gestionar estadísticas diarias:
     - `getStats()`: Obtener estadísticas de un día específico
     - `updateStats()`: Actualizar estadísticas
     - `getWeeklyStats()`: Obtener datos de los últimos 7 días
     - `incrementStat()`: Incrementar un campo específico

### ✅ Backend (Rust)

#### 1. **Mejorado main.rs** (`src-tauri/src/main.rs`)
   - Añadida nueva estructura `StatsPayload` para emitir estadísticas completas
   - Añadida nueva estructura `StateChangePayload` para emitir cambios de estado
   - Mejorada `start_timer_thread()`:
     - Ahora emite evento `state-changed` cuando cambia el estado
     - Emite `StatsPayload` completo en lugar de solo valores individuales
     - Mejor seguimiento del estado anterior para detectar cambios
   - Mejorada `start_activity_listener()`:
     - Emite `StatsPayload` completo con todos los contadores
   - Mejorada `pause_pomodoro()`:
     - Ahora emite `StatsPayload` completo
   - Corrección de la función `save_stats_to_disk()` para emitir evento `update-daily-stats` al frontend
   - Actualización de la función `get_daily_stats()` con comentarios sobre la nueva arquitectura

### ✅ Configuración del Proyecto

#### 1. **Instalación de dependencias**
   - Instalado `@tauri-apps/plugin-store` para persistencia de datos

#### 2. **vite.config.ts** ya estaba configurado correctamente
   - Soporta múltiples páginas (main e index)
   - Configuración optimizada para Tauri

### ✅ Compilación

✓ **Frontend compila sin errores**
```
✓ 47 modules transformed.
dist/index.html                    0.55 kB
dist/toast.html                    0.55 kB
✓ built in 2.55s
```

✓ **Backend compila sin errores**
```
Finished `dev` profile [unoptimized + debuginfo] target(s)
```

---

## 🎨 Mejoras Visuales Implementadas

### Dashboard
- **Diseño moderno** con gradiente púrpura de fondo
- **Header elegante** con título y subtítulo
- **Timer display gigante** con gradiente de texto
- **Tarjetas de estadísticas** con:
  - Iconos emojis
  - Colores diferenciados (azul para concentración, verde para descansos, gris para inactividad)
  - Efecto hover con elevación
- **Gráfica interactiva** con colores modernos y bordes redondeados
- **Botones dinámicos** que cambian según el estado (Iniciar/Pausar)

### Toasts
- **Animaciones suaves** con transformaciones CSS
- **Gradientes de color** específicos por tipo
- **Efectos visuales** como:
  - `bounceIn`: Entrada del toast
  - `shake`: Para advertencias (angry)
  - `heartBeat`: Para motivación
- **Contenedor flexible** que se adapta al contenido

---

## 📊 Flujo de Datos Actual

1. **Rust Backend**: Monitorea actividad global y mantiene el timer
2. **Eventos emitidos**:
   - `timer-tick`: Cada segundo del timer
   - `stats-update`: Cambios en estadísticas
   - `state-changed`: Cambio de estado (Focus/Break/Idle)
   - `update-daily-stats`: Cuando termina un ciclo
   - `show-toast`: Para mostrar notificaciones
3. **Frontend React**: Consume eventos y actualiza UI
4. **Store Manager**: Persiste datos en `stats.dat`
5. **Chart.js**: Visualiza datos históricos

---

## �📜 Licencia

Este proyecto se distribuye bajo la **Licencia MIT**. Consulta el archivo `LICENSE` para más detalles.