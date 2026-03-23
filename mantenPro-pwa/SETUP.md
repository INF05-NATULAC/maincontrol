# 🚀 MantenPro PWA — Guía de Instalación Completa
# Google Sheets + GitHub Pages (Sin servidores, GRATIS)

---

## ⏱️ Tiempo total: ~20 minutos

---

## PASO 1 — Crear el backend en Google Sheets (10 min)

### 1.1 — Abrir Google Apps Script
1. Ve a → https://script.google.com
2. Click en **"Nuevo proyecto"**
3. Borra el código que viene por defecto
4. Copia y pega TODO el contenido del archivo `sheets-backend/Code.gs`
5. Guarda el proyecto: Ctrl+S → Nombre: "MantenPro Backend"

### 1.2 — Inicializar la base de datos
1. En el menú superior selecciona la función: **`inicializarSistema`**
2. Click en el botón ▶ **Ejecutar**
3. La primera vez pedirá permisos → Click "Revisar permisos" → "Permitir"
4. Verás en el Log: `✅ Sistema inicializado correctamente`

### 1.3 — Desplegar como API
1. Click en **"Implementar"** → **"Nueva implementación"**
2. Click en el ícono ⚙️ → **"Aplicación web"**
3. Configurar:
   - Descripción: `MantenPro API v1`
   - Ejecutar como: **`Yo mismo`**
   - Quién puede acceder: **`Cualquier persona`**
4. Click **"Implementar"**
5. **📋 COPIA LA URL** que aparece (se ve así):
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   ⚠️ Guarda esta URL, la necesitarás en el Paso 3

### 1.4 — Verificar que funciona
Pega esta URL en tu navegador (reemplaza TU_URL):
```
https://script.google.com/macros/s/TU_URL/exec?path=health
```
Debes ver: `{"status":"ok","version":"1.0.0"}`

---

## PASO 2 — Subir el código a GitHub (5 min)

### 2.1 — Crear repositorio en GitHub
1. Ve a → https://github.com/new
2. Nombre del repositorio: `mantenpro` (en minúsculas)
3. Visibilidad: **Público** (requerido para GitHub Pages gratis)
4. Click **"Create repository"**

### 2.2 — Subir el código
Tienes dos opciones:

**Opción A — Desde la web de GitHub (más fácil):**
1. En tu nuevo repositorio, click **"uploading an existing file"**
2. Arrastra TODOS los archivos de la carpeta `mantenPro-pwa/`
3. Click **"Commit changes"**

**Opción B — Desde WSL (más profesional):**
```bash
cd ~/mantenPro-pwa

# Configurar git (solo primera vez)
git config --global user.email "tu@email.com"
git config --global user.name "Tu Nombre"

# Inicializar y subir
git init
git add .
git commit -m "MantenPro PWA v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mantenpro.git
git push -u origin main
```

---

## PASO 3 — Configurar la URL del backend (2 min)

### 3.1 — Agregar la URL como Secret en GitHub
1. En tu repositorio GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Nombre: `VITE_SHEETS_URL`
4. Valor: pega la URL de Google Apps Script del Paso 1.3
5. Click **"Add secret"**

### 3.2 — Activar GitHub Pages
1. En tu repositorio → **Settings** → **Pages**
2. Source: **"GitHub Actions"**
3. Click **Save**

---

## PASO 4 — Desplegar automáticamente (2 min)

### 4.1 — Ejecutar el deploy
1. Ve a la pestaña **Actions** de tu repositorio
2. Click en **"Deploy MantenPro to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Espera ~2 minutos mientras construye y despliega

### 4.2 — Acceder a tu aplicación
Una vez terminado, tu app estará en:
```
https://TU_USUARIO.github.io/mantenpro/
```

---

## 🔑 Credenciales de acceso

| Usuario | Contraseña | Rol |
|---|---|---|
| superadmin | Admin123! | Super Administrador |
| admin | Admin123! | Administrador |
| gerente | Admin123! | Gerente |
| supervisor1 | Admin123! | Supervisor |
| operador1 | Admin123! | Operador |
| jefe_prod | Admin123! | Jefe |

---

## 📱 Instalar como app en el celular

Una vez que la app esté publicada:

**Android (Chrome):**
1. Abre la URL en Chrome
2. Menú (⋮) → **"Agregar a pantalla de inicio"**
3. Click **"Instalar"**

**iPhone (Safari):**
1. Abre la URL en Safari
2. Botón compartir (□↑) → **"Agregar a pantalla de inicio"**
3. Click **"Agregar"**

---

## 🔄 Actualizar la app después de cambios

Cada vez que hagas `git push` a la rama `main`, GitHub Actions
desplegará automáticamente la nueva versión en 2 minutos.

---

## 📊 Ver los datos en Google Sheets

Tus datos se guardan directamente en la hoja de cálculo de Google:
1. Ve a → https://drive.google.com
2. Busca el archivo creado por Apps Script
3. Verás las hojas: Usuarios, Areas, Subareas, Maquinas, Paradas, Motivos

---

## 🆘 Solución de problemas

**Error: "La app no carga"**
→ Verifica que el repositorio sea público
→ Verifica que GitHub Pages esté activado con "GitHub Actions"

**Error: "No autorizado" al hacer login**
→ Verifica que la URL del Secret sea la correcta (sin espacios)
→ Vuelve a ejecutar `inicializarSistema()` en Apps Script

**Error: "connection refused" en Apps Script**
→ En el despliegue, asegúrate de seleccionar "Cualquier persona" en acceso

**Cambié código pero no se actualiza**
→ En Apps Script: Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar
