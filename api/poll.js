import { pool } from './_db.js';

export default async function handler(req, res) {
  try {
    const poll = (
      await pool.query('select * from polls where is_open = true order by id desc limit 1')
    ).rows[0];

    if (!poll) return res.status(200).json({ poll: null, contestants: [] });

    const { rows } = await pool.query(
      `select c.id, c.name, c.photo_url, c.age, c.profession, c.hometown, c.about,
              count(v.id)::int as votes
       from poll_contestants pc
       join contestants c on c.id = pc.contestant_id
       left join votes v on v.contestant_id = c.id and v.poll_id = pc.poll_id
       where pc.poll_id = $1
       group by c.id
       order by c.name`,
      [poll.id]
    );

    res.status(200).json({ poll, contestants: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}