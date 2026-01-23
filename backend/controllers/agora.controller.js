const { RtcTokenBuilder, RtcRole } = require('agora-access-token')

/**
 * Generate Agora RTC Token
 * POST /api/v1/agora/token
 * Body: { channelName: string, uid?: number, role?: 'publisher' | 'subscriber' }
 */
const generateToken = async (req, res) => {
  try {
    const { channelName, uid = 0, role = 'publisher' } = req.body

    if (!channelName) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      })
    }

    const appId = process.env.AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    if (!appId) {
      return res.status(500).json({
        success: false,
        message: 'Agora App ID not configured'
      })
    }

    // If no certificate, use null token (testing mode)
    if (!appCertificate || appCertificate === 'your_agora_app_certificate_here') {
      console.log('⚠️  Running Agora in testing mode (no certificate) - null token')
      return res.json({
        success: true,
        data: {
          token: null, // null token for testing without certificate
          appId,
          channelName,
          uid,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        }
      })
    }

    // Token expiration time (24 hours from now)
    const expirationTimeInSeconds = 86400
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // Set role (publisher can publish and subscribe, subscriber can only subscribe)
    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    )

    res.json({
      success: true,
      data: {
        token,
        appId,
        channelName,
        uid,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
      }
    })
  } catch (error) {
    console.error('Error generating Agora token:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate token',
      error: error.message
    })
  }
}

module.exports = {
  generateToken
}
