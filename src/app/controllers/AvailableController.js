import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  format,
  isAfter,
} from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
  async index(req, res) {
    console.log(new Date().getTime());

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data invalida' });
    }

    const typeDate = Number(date);

    const appointment = await Appointment.finddAll({
      where: {
        provider_id: req.params.providerId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(typeDate), endOfDay(typeDate)],
        },
      },
    });

    const schedule = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
    ];

    const available = schedule.map(time => {
      const [hour, minute] = time.split(':');
      const value = setSeconds(setMinutes(setHours(typeDate, hour), minute), 0);
      return {
        time,
        value: format(value, "yyy-MM-dd'T'HH:mm:ssxxx"),
        available:
          isAfter(value, new Date()) &&
          !appointment.find(a => format(a.date, time === 'HH:mm')),
      };
    });

    return res.json(available);
  }
}

export default new AvailableController();
