# ⚙️ MaintControl — Sistema de Gestión de Paradas Industriales

PWA instalable para gestión de paradas de máquinas en entornos industriales.

## 🚀 Deploy en GitHub Pages

### 1. Crear repositorio en GitHub
```bash
git init
git remote add origin https://github.com/TU_USUARIO/maintcontrol.git
```

### 2. Subir código
```bash
git add .
git commit -m "feat: Initial MaintControl PWA"
git push -u origin main
```

### 3. Activar GitHub Pages
- Ve a: **Settings → Pages**
- Source: **GitHub Actions**
- El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente.
- Tu app estará en: `https://TU_USUARIO.github.io/maintcontrol/`

---

## 🧩 Arquitectura

```
maintcontrol/
├── index.html              # Entrada PWA
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker (offline, caché, push)
├── css/
│   └── app.css             # Estilos globales (tema industrial oscuro)
├── js/
│   ├── services/
│   │   ├── dataService.js  # 🔑 Capa de abstracción de datos (intercambiable)
│   │   ├── authService.js  # Autenticación y roles (RBAC)
│   │   └── notificationService.js  # Alertas y push notifications
│   └── modules/
│       ├── dashboard.js    # Dashboard con gráficos Chart.js
│       ├── stopages.js     # CRUD de paradas de máquinas
│       └── admin.js        # Administración: áreas, usuarios, máquinas, config
├── icons/                  # Iconos PWA (todos los tamaños)
└── .github/workflows/
    └── deploy.yml          # CI/CD automático a GitHub Pages
```

---

## 🔌 Conectar Google Sheets como backend

### 1. Crear Google Apps Script

En tu Google Sheet, ve a: **Extensiones → Apps Script** y pega este código:

```javascript
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID';

function doGet(e) {
  const { action, data } = e.parameter;
  const payload = data ? JSON.parse(decodeURIComponent(data)) : {};
  
  const handlers = { getAll, create, update, delete: deleteRecord };
  const result = handlers[action]?.(payload) ?? { error: 'Unknown action' };
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAll({ sheet }) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheet);
  if (!ws) return [];
  const [headers, ...rows] = ws.getDataRange().getValues();
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

function create({ sheet, data }) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ws = ss.getSheetByName(sheet) || ss.insertSheet(sheet);
  const headers = ws.getRange(1,1,1,ws.getLastColumn()).getValues()[0];
  if (!headers.length) ws.appendRow(Object.keys(data));
  ws.appendRow(Object.values(data));
  return { success: true };
}
```

### 2. Desplegar como Web App

- Ejecutar → Implementar → Nueva implementación
- Tipo: **Aplicación web**
- Ejecutar como: **Yo**
- Quién tiene acceso: **Cualquier persona**
- Copiar la URL generada

### 3. Configurar en la app

En `js/services/dataService.js`, línea `SheetsService`:
```javascript
const CONFIG = {
  scriptUrl: 'TU_URL_DE_APPS_SCRIPT_AQUI',
};
```

Y en `DataService`, cambiar el adaptador:
```javascript
const BACKEND = 'googleSheets'; // En lugar de 'localStorage'
```

---

## 🔄 Migrar a MySQL / PostgreSQL / Firestore

La arquitectura usa el patrón **Repository + Adapter**.

Solo necesitas reemplazar el adaptador en `dataService.js`:

```javascript
// Adaptador REST (para Express + MySQL/PostgreSQL)
async function restAdapter(method, endpoint, body) {
  const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}
```

El frontend **no necesita cambios**. Todos los módulos (dashboard, stopages, admin) consumen `DataService.getAll()`, `DataService.create()`, etc.

---

## 👥 Roles y permisos

| Rol | Nivel | Capacidades |
|-----|-------|-------------|
| Super Admin | 8 | Todo, incluyendo crear áreas/subáreas |
| Administrador | 7 | CRUD usuarios, máquinas, motivos |
| Gerente | 6 | Ver todo, exportar, editar tiempos |
| Jefe de Área | 5 | Supervisar su área, editar paradas |
| Supervisor | 4 | Crear/editar paradas, cambiar estado |
| Técnico | 3 | Crear paradas, cambiar estado |
| Operario | 2 | Solo crear paradas |
| Visualizador | 1 | Solo lectura |

---

## 📱 Instalación como PWA

1. Abre la app en Chrome (Android) o Safari (iOS)
2. Android: Aparece banner automático "Instalar"
3. iOS: Compartir → "Agregar a pantalla de inicio"
4. La app funcionará offline con los últimos datos cacheados

---

## 🧪 Usuarios demo

| Email | Contraseña | Rol |
|-------|------------|-----|
| superadmin@plant.com | admin123 | Super Admin |
| admin@plant.com | admin123 | Admin |
| supervisor@plant.com | admin123 | Supervisor |
| tecnico@plant.com | admin123 | Técnico |

---

## 📋 Hojas requeridas en Google Sheets

| Hoja | Descripción |
|------|-------------|
| `areas` | Áreas de la planta |
| `subareas` | Subáreas por área |
| `machines` | Máquinas por subárea |
| `users` | Usuarios del sistema |
| `stopReasons` | Catálogo de motivos |
| `stopages` | Registro de paradas |
| `alertConfig` | Configuración de alertas |

---

## 🛠 Stack Tecnológico

- **Frontend**: Vanilla JS modular (migrable a React/Vue sin cambiar servicios)
- **Estilos**: CSS custom con variables (sin dependencia de framework)
- **Gráficos**: Chart.js 4
- **Excel Export**: SheetJS (xlsx)
- **Backend actual**: localStorage + Google Sheets (via Apps Script)
- **PWA**: Service Worker, Web App Manifest, Cache API, Background Sync
- **CI/CD**: GitHub Actions → GitHub Pages
