import { app } from './app';
import { config } from './config';
import { checkAlerts } from './services/alerts';

app.listen(config.port, () => {
  console.log(`NL Weather Dashboard running on http://localhost:${config.port}`);
  console.log(`Location: ${config.locationName} (${config.latitude}, ${config.longitude})`);

  if (config.haWebhookUrl) {
    console.log('HA alerts enabled');
    setTimeout(checkAlerts, 10_000);
    setInterval(checkAlerts, config.alerts.checkInterval);
  }
});
