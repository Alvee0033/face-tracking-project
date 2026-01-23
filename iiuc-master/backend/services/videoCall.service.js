const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// Get these from Agora Console: https://console.agora.io/
const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

/**
 * Generate Agora RTC token for video call
 * @param {string} channelName - Unique channel name (e.g., interview-{applicationId})
 * @param {number} uid - User ID (0 for auto-assign)
 * @param {string} role - 'publisher' or 'subscriber'
 * @param {number} expirationTimeInSeconds - Token validity (default: 3600)
 */
const generateToken = (channelName, uid = 0, role = 'publisher', expirationTimeInSeconds = 3600) => {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in environment variables');
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs
  );

  return {
    token,
    appId: APP_ID,
    channelName,
    uid,
    expirationTime: privilegeExpiredTs
  };
};

module.exports = {
  generateToken
};
