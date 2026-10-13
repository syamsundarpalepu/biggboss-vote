import crypto from 'crypto';
import { pool } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pollId, contestantId, deviceId } = req.body || {};
  if (!pollId || !contestantId || !deviceId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipHash = crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT)
    .digest('hex');

  try {
    const poll = (await pool.query('select is_open from polls where id = $1', [pollId])).rows[0];
    if (!poll || !poll.is_open) {
      return res.status(400).json({ error: 'Ee poll close ayyindi' });
    }

    const ipCount = (
      await pool.query('select count(*)::int as c from votes where poll_id = $1 and ip_hash = $2', [
        pollId,
        ipHash,
      ])
    ).rows[0].c;
    if (ipCount >= 10) {
      return res.status(429).json({ error: 'Ee network nundi chala votes vachayi' });
    }

    await pool.query(
      'insert into votes (poll_id, contestant_id, device_id, ip_hash) values ($1, $2, $3, $4)',
      [pollId, contestantId, deviceId, ipHash]
    );

    res.status(200).json({ ok: true });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Meeru already vote chesaru' });
    }
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}