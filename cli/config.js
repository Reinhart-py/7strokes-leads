const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '../.7strokes-config.json');

const DEFAULT_CONFIG = {
  backendPort: 4000,
  tunnel: {
    type: 'ngrok',
    authtoken: '',
    domain: '',
    customCommand: ''
  },
  telegram: {
    enabled: false,
    botToken: '',
    allowedChatIds: [],
    notifyOnStart: true,
    notifyOnJobComplete: true
  }
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...data };
    } catch (e) {
      console.warn('[!] Warning: .7strokes-config.json corrupted. Using defaults.');
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function askQuestion(rl, query, defaultValue = '') {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function promptConfig(forcePrompt = false, onlyBot = false) {
  let config = loadConfig();

  const hasTunnelConfig = Boolean(config.tunnel?.authtoken || config.tunnel?.domain);
  const hasBotConfig = Boolean(config.telegram?.botToken && config.telegram?.allowedChatIds?.length);

  if (!forcePrompt) {
    if (onlyBot && hasBotConfig) return config;
    if (!onlyBot && (hasTunnelConfig || fs.existsSync(CONFIG_PATH))) return config;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '='.repeat(60));
  console.log('         7STROKES FIRST-TIME CONFIGURATION SETUP         ');
  console.log('='.repeat(60));
  console.log('Press [Enter] to accept defaults or skip any optional field.\n');

  try {
    if (!onlyBot) {
      console.log('--- [1/2] TUNNEL CONFIGURATION (NGROK / CLOUDFLARE) ---');
      console.log('Allows your phone or external browser to access your 7strokes backend.\n');

      const authtoken = await askQuestion(
        rl,
        'Ngrok Authtoken (Optional, press Enter to skip)\n  Example: 2Nxxx_abcdef123456789\n  Value: ',
        config.tunnel?.authtoken || ''
      );

      const domain = await askQuestion(
        rl,
        '\nNgrok Custom/Static Domain (Optional, press Enter for random)\n  Example: uremic-lupita-pedodontic.ngrok-free.dev\n  Value: ',
        config.tunnel?.domain || ''
      );

      config.tunnel = {
        ...config.tunnel,
        authtoken: authtoken.trim(),
        domain: domain.trim(),
        type: authtoken || domain ? 'ngrok' : 'cloudflared'
      };
    }

    console.log('\n--- [2/2] TELEGRAM BOT CONFIGURATION (FK BOT) ---');
    console.log('Control 7strokes, trigger searches, and receive leads directly via Telegram.\n');

    const botToken = await askQuestion(
      rl,
      'Telegram Bot Token (From @BotFather, press Enter to skip)\n  Example: 7123456789:AAHk123_xyzABCdef456\n  Value: ',
      config.telegram?.botToken || ''
    );

    let chatIds = config.telegram?.allowedChatIds || [];
    if (botToken) {
      const chatIdsStr = await askQuestion(
        rl,
        '\nAllowed Telegram Chat IDs (comma-separated, get from @userinfobot)\n  Example: 12345678, 87654321\n  Value: ',
        chatIds.join(', ')
      );

      chatIds = chatIdsStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    config.telegram = {
      enabled: Boolean(botToken && chatIds.length),
      botToken: botToken.trim(),
      allowedChatIds: chatIds,
      notifyOnStart: true,
      notifyOnJobComplete: true
    };

    saveConfig(config);
    console.log('\n[+] Configuration saved successfully to .7strokes-config.json!\n');
    return config;
  } finally {
    rl.close();
  }
}

module.exports = {
  CONFIG_PATH,
  loadConfig,
  saveConfig,
  promptConfig
};
