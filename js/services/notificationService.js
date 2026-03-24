/**
 * MaintControl - Notification Service
 * Handles visual alerts, push notifications, and prolonged stop detection.
 */

window.NotificationService = (() => {
  let pollingInterval = null;
  let toastContainer = null;

  function init() {
    toastContainer = document.getElementById('toast-container');
    startPolling();
    setupPushNotifications();
  }

  function setupPushNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, let user trigger it
    }
  }

  async function requestPush() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(checkProlongedStops, 60000); // every 60s
    checkProlongedStops(); // immediate
  }

  function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
  }

  function checkProlongedStops() {
    const user = AuthService.getUser();
    if (!user) return;

    const config = DataService.getAll('alertConfig')[0] || { prolongedStopMinutes: 60 };
    const threshold = config.prolongedStopMinutes || 60;
    const now = new Date();

    const stopages = DataService.getAll('stopages');
    const active = stopages.filter(s => s.status !== 'finalizado' && s.startAt);

    active.forEach(s => {
      const elapsed = Math.round((now - new Date(s.startAt)) / 60000);
      if (elapsed >= threshold) {
        const machine = DataService.getById('machines', s.machineId);
        const alreadyAlerted = sessionStorage.getItem('alerted_' + s.id);
        if (!alreadyAlerted) {
          sessionStorage.setItem('alerted_' + s.id, '1');
          showToast(
            `⚠️ Parada prolongada: ${machine?.name || 'Máquina'}`,
            `Lleva ${elapsed} minutos detenida. Estado: ${s.status}`,
            'warning',
            8000
          );
          sendBrowserNotification(
            `Parada prolongada: ${machine?.name || 'Máquina'}`,
            `Lleva ${elapsed} minutos detenida.`
          );
          window.dispatchEvent(new CustomEvent('prolonged-stop', { detail: { stopage: s, elapsed, machine } }));
        }
      }
    });
  }

  function showToast(title, message, type = 'info', duration = 4000) {
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;
    }

    const icons = { info: '💬', success: '✅', warning: '⚠️', error: '❌' };
    const colors = { info: '#00d4ff', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
      background: rgba(10,15,30,0.95);
      border: 1px solid ${colors[type]};
      border-left: 4px solid ${colors[type]};
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
      min-width: 280px;
      max-width: 360px;
      animation: slideIn 0.3s ease;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span>${icons[type]}</span>
        <strong style="color:${colors[type]};font-family:Orbitron,sans-serif;font-size:12px;">${title}</strong>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.4">${message}</p>
    `;
    toast.addEventListener('click', () => toast.remove());
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function sendBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag: 'maintcontrol-alert'
      });
    }
  }

  return { init, showToast, requestPush, checkProlongedStops, startPolling, stopPolling };
})();
