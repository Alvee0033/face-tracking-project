const jwt = require('jsonwebtoken');

const APP_ID = process.env.JITSI_APP_ID || '';
const API_KEY_ID = process.env.JITSI_API_KEY_ID || '';
const PRIVATE_KEY = (process.env.JITSI_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const DEFAULT_DOMAIN = process.env.JITSI_DOMAIN || '8x8.vc';

const ensureEnv = () => {
  if (!APP_ID || !API_KEY_ID || !PRIVATE_KEY) {
    throw new Error('JITSI_APP_ID, JITSI_API_KEY_ID, and JITSI_PRIVATE_KEY must be configured');
  }
};

const buildFeatures = (isModerator = false) => ({
  livestreaming: isModerator ? 'true' : 'false',
  recording: isModerator ? 'true' : 'false',
  transcription: 'false',
  "outbound-call": 'false',
  "sip-outbound-call": 'false'
});

const generateJitsiToken = ({
  roomName,
  userName,
  userEmail,
  isModerator = false,
  ttlSeconds = 3600
}) => {
  ensureEnv();

  if (!roomName) {
    throw new Error('roomName is required');
  }

  const name = userName || (isModerator ? 'Recruiter' : 'Candidate');
  const email = userEmail || `${name.toLowerCase().replace(/\s+/g, '')}@jobsite.local`;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;

  const payload = {
    aud: 'jitsi',
    iss: APP_ID,
    sub: APP_ID,
    room: roomName,
    exp,
    nbf: now - 10,
    context: {
      user: {
        name,
        email,
        avatar: null,
        moderator: isModerator ? 'true' : 'false'
      },
      features: buildFeatures(isModerator)
    }
  };

  const token = jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    header: {
      kid: API_KEY_ID,
      typ: 'JWT'
    }
  });

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    domain: DEFAULT_DOMAIN,
    roomName
  };
};

module.exports = {
  generateJitsiToken
};