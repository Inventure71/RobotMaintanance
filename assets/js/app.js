import { initDashboardApp } from './modules/dashboard-app.js';
import { ensureThemeStyles, resolveInitialThemeId } from './components/theme-style-loader.js';

async function bootstrapDashboardApp() {
  const initialTheme = resolveInitialThemeId();
  await ensureThemeStyles(initialTheme);
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }
  initDashboardApp();
}

bootstrapDashboardApp().catch((error) => {
  console.error('Dashboard bootstrap failed.', error);
});
