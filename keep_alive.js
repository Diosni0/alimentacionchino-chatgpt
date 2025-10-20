import { CronJob } from 'cron';
import https from 'https';

// get env RENDER_EXTERNAL_URL
const render_url = process.env.RENDER_EXTERNAL_URL;

if (!render_url) {
    console.log("No RENDER_EXTERNAL_URL found. Please set it as environment variable.");
}

let botInstance = null;

// Keep alive job - runs every 14 minutes
const job = new CronJob('*/14 * * * *', function () {
    console.log('­ƒöä Making keep alive call');

    // Keep server alive
    if (render_url) {
        https.get(render_url, (resp) => {
            if (resp.statusCode === 200) {
                console.log("Ô£à Keep alive call successful");
            } else {
                console.log(`ÔÜá´©Å Keep alive call failed with status: ${resp.statusCode}`);
            }
        }).on("error", (err) => {
            console.log("ÔØî Error making keep alive call:", err.message);
        });
    }

    // Keep bot connection alive by checking its status
    if (botInstance && botInstance.client) {
        try {
            const readyState = botInstance.client.readyState();
            console.log(`­ƒñû Bot connection status: ${readyState}`);

            // If bot is disconnected, try to reconnect
            if (readyState === 'CLOSED' || readyState === 'CLOSING') {
                console.log('­ƒöä Bot disconnected, attempting reconnection...');
                botInstance.client.connect().catch(err => {
                    console.error('ÔØî Bot reconnection failed:', err.message);
                });
            }
        } catch (error) {
            console.error('ÔØî Error checking bot status:', error.message);
        }
    }
});

// Health check job - runs every 5 minutes for more frequent monitoring
const healthCheckJob = new CronJob('*/5 * * * *', function () {
    if (botInstance && botInstance.client) {
        try {
            const readyState = botInstance.client.readyState();
            if (readyState !== 'OPEN') {
                console.log(`ÔÜá´©Å Bot health check: Connection is ${readyState}`);
            }
        } catch (error) {
            console.error('ÔØî Health check error:', error.message);
        }
    }
});

// Function to set bot instance reference
function setBotInstance(bot) {
    botInstance = bot;
    console.log('­ƒñû Bot instance registered for keep-alive monitoring');
}

export { job, healthCheckJob, setBotInstance };
