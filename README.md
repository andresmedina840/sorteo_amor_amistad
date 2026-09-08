# 💌 Sorteo de Amor y Amistad (Amigo Secreto) — Edición Colombia 🇨🇴

Una aplicación web profesional, elegante y moderna para organizar el tradicional juego de **Amor y Amistad / Amigo Secreto**. 

Diseñada bajo los principios de **Clean Code**, **Programación Orientada a Objetos (POO)**, **Principios SOLID**, animaciones fluidas con **Framer Motion**, alertas interactivas con **SweetAlert2** y arquitectura sin servidor desplegable **100% gratis**.

---

## ✨ Características Principales

1. **Restricción Inteligente de Familiares / Parejas:**
   - Asigna un grupo familiar o de exclusión a los participantes (ej: *"Familia Gómez"*, *"Pareja 1"*).
   - El motor de sorteo basado en **Backtracking con Heurística MRV** garantiza matemáticamente que ningún familiar le regale a otro miembro de su mismo grupo ni a sí mismo.
   - Detecta e informa de inmediato si las restricciones son matemáticamente imposibles antes de sortear.

2. **Formato Oficial de Fecha y Hora de Colombia:**
   - Configuración de la fecha y hora de entrega bajo el formato estricto:  
     `dd/mm/yyyy hh:mm:ss am o pm` *(Ejemplo: 20/09/2026 07:30:00 pm)*.
   - Incluye contador regresivo dinámico en vivo (días, horas, minutos, segundos).

3. **Presupuesto Máximo del Regalo:**
   - Define el tope económico del detalle con separador de miles en Pesos Colombianos (`$ COP`) o divisas internacionales (`USD`, `EUR`, `MXN`).
   - Botones de atajo rápido para montos comunes ($30k, $50k, $80k, $100k COP).

4. **Entrega de Sobres 100% Privada por WhatsApp:**
   - Botón directo para compartir el sobre a cada participante por WhatsApp con un solo clic.
   - El mensaje incluye el saludo personalizado, la fecha y hora colombiana de entrega, el presupuesto y un **enlace cifrado**.
   - Cada persona sólo puede ver a su propio amigo secreto al abrir su sobre digital, preservando el misterio absoluto.

5. **Modo Presencial "Pasa el Teléfono":**
   - Para reuniones familiares o de amigos donde todos están juntos. Cada persona elige su nombre, confirma su identidad y descubre su tarjeta secreta sin necesidad de enviar mensajes.

6. **Experiencia de Usuario Premium (Framer Motion + SweetAlert2):**
   - Sobre interactivo 3D con sello de cera que se rompe al tacto.
   - Lluvia de confeti festivo (`canvas-confetti`).
   - Diálogos y notificaciones estilizadas con `SweetAlert2` adaptadas al tema oscuro y refinado de Amor y Amistad.

7. **Persistencia Automática Local:**
   - Todos los datos se guardan en el `localStorage` del navegador para que no pierdas tu evento si recargas la página o cierras el navegador.

---

## 🏛️ Arquitectura de Software y Buenas Prácticas

### Principios SOLID
- **S (Single Responsibility):** Cada clase tiene una única razón para cambiar. Separación estricta entre Dominio (`Participant`, `EventConfig`, `DrawPair`), Algoritmos (`BacktrackingDrawEngine`), Criptografía (`WebCryptoService`), Persistencia (`LocalStorageAdapter`) e Interfaz React.
- **O (Open/Closed):** Interfaz `IDrawEngine` e `ICryptoService` abiertas a extensión mediante nuevas estrategias sin modificar el código de la UI.
- **L (Liskov Substitution):** Cualquier implementación que respete el contrato de `IDrawEngine` puede sustituir al motor actual sin alterar el flujo de aplicación.
- **I (Interface Segregation):** Tipos TypeScript específicos e independientes para evitar dependencias innecesarias.
- **D (Dependency Inversion):** Los casos de uso (`DrawUseCases`) y el contexto de React dependen de abstracciones (`IDrawEngine`, `ICryptoService`) inyectadas en tiempo de ejecución.

### Privacidad y Cero Costo de Infraestructura
- Toda la lógica corre en el navegador del usuario (**Client-Side Architecture**).
- El secreto viaja codificado y seguro en el fragmento hash (`#revelar=...`), lo que significa que **no se envía a ningún servidor backend**.
- **Costo de mantenimiento: $0 COP.**

---

## 🚀 Cómo Ejecutar en Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo local
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🌐 Cómo Publicar Gratis en Internet

Puedes alojar esta aplicación de forma permanente y gratuita en cualquiera de las siguientes plataformas:

### Opción 1: Vercel (Recomendada - 1 minuto)
1. Sube tu código a un repositorio de GitHub (o GitLab).
2. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **"Add New Project"** y selecciona tu repositorio `sorteo_amor_amistad`.
4. Vercel detectará automáticamente Vite. Haz clic en **"Deploy"**.
5. ¡Listo! Tendrás tu enlace HTTPS permanente (ejemplo: `https://sorteo-amor-amistad.vercel.app`).

### Opción 2: Netlify
1. Entra a [netlify.com](https://netlify.com).
2. Arrastra la carpeta `dist` (generada con `npm run build`) en la sección **Deploys**, o conecta tu repositorio de GitHub.
3. Comando de construcción: `npm run build` | Carpeta de publicación: `dist`.

### Opción 3: GitHub Pages
1. En `vite.config.ts`, agrega: `base: './'`.
2. Ejecuta `npm run build`.
3. Sube la carpeta a la rama `gh-pages` de tu repositorio en GitHub.

---

## 🛠️ Tecnologías Empleadas
- **React 19 + TypeScript**
- **Vite 6**
- **Framer Motion** (Animaciones UI/UX de alta fidelidad)
- **SweetAlert2** (Diálogos y alertas modales premium)
- **Lucide React** (Iconografía moderna)
- **Canvas Confetti** (Efectos visuales festivos)
- **Vanilla CSS3** (Variables CSS, Glassmorphism, Gradientes Rubí y Oro)
