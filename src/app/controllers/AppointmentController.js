import * as yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';
import Queue from '../../lib/Queue';
import CancelMail from '../jobs/CancelMail';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = yup.object().shape({
      date: yup.date().required(),
      provider_id: yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Dados Invalido' });
    }
    const { provider_id, date } = req.body;
    // check userId igual a provider id
    if (provider_id === req.userId) {
      return res
        .status(400)
        .json({ error: 'Não é possível agendar com você mesmo' });
    }
    // Check se provider_id é provider
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res.status(401).json({ error: 'Provider não existe' });
    }

    // Check date validation

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res
        .status(401)
        .json({ error: 'Não é possível agendar para uma data passada' });
    }

    const checkDate = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: 'Provider já tem agendamento este horario' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /**
     *  Notify appointment provider
     */

    const user = await User.findByPk(req.userId);
    const dateFormatted = format(
      hourStart,
      "'dia' dd 'de' MMMM', às 'H:mm'h'",
      {
        locale: pt,
      }
    );
    await Notification.create({
      content: `Novo agendamento de ${user.name} para o ${dateFormatted}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    /**
     * Verificando se já esta cancelado
     */

    // if (appointment.canceled_at) {
    //   return res.status(401).json({ error: 'Agendamento já esta cancelado' });
    // }

    if (appointment.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: 'Você não pode cancelar um agendamento que não é seu' });
    }

    const dateSubTwoHours = subHours(appointment.date, 2);

    if (isBefore(dateSubTwoHours, new Date())) {
      return res
        .status(400)
        .json({ erro: 'Você precisa cancelar com duas horas de antecedencia' });
    }

    appointment.canceled_at = new Date();

    appointment.save();

    await Queue.add(CancelMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
