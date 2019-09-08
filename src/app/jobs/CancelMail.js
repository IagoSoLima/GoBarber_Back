import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class CancelMail {
  get key() {
    return 'CancelMail';
  }

  async handle({ data }) {
    const { appointment } = data;
    console.log('A Fila executou');
    await Mail.sendMail({
      to: `${appointment.provider.email}`,
      subject: 'Informativo de agendamento',
      template: 'cancel',
      context: {
        provider: appointment.provider.name,
        client: appointment.user.name,
        date: format(
          parseISO(appointment.date),
          "'dia' dd 'de' MMMM', às 'H:mm'h'",
          {
            locale: pt,
          }
        ),
      },
    });
  }
}

export default new CancelMail();
