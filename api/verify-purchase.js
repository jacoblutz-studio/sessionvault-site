const https = require('https');

module.exports = async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ valid: false, error: 'No session ID' });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) {
    return res.status(500).json({ valid: false, error: 'Server config error' });
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.stripe.com',
      path: `/v1/checkout/sessions/${sessionId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
      },
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const session = JSON.parse(data);
          if (session.payment_status === 'paid') {
            res.status(200).json({
              valid: true,
              downloadUrl: process.env.DMG_DOWNLOAD_URL || '/SessionVault.dmg',
            });
          } else {
            res.status(200).json({ valid: false, error: 'Payment not completed' });
          }
        } catch (e) {
          res.status(500).json({ valid: false, error: 'Parse error' });
        }
        resolve();
      });
    });

    request.on('error', () => {
      res.status(500).json({ valid: false, error: 'Verification failed' });
      resolve();
    });

    request.end();
  });
};
