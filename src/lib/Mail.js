import nodemailer from 'nodemailer';
import { resolve } from 'path';
import expresshbs from 'express-handlebars';
import nodemailerhbs from 'nodemailer-express-handlebars';
import configMail from '../config/mail';

class Mail {
  constructor() {
    const { host, port, secure, auth } = configMail;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: auth.user ? auth : null,
    });

    this.configureTemplate();
  }

  configureTemplate() {
    const viewPath = resolve(__dirname, '..', 'app', 'views', 'emails');

    this.transporter.use(
      'compile',
      nodemailerhbs({
        viewEngine: expresshbs.create({
          layoutsDir: resolve(viewPath, 'layouts'),
          partialsDir: resolve(viewPath, 'partials'),
          defaultLayout: 'default',
          extname: '.hbs',
        }),
        viewPath,
        extName: '.hbs',
      })
    );
  }

  sendMail(message) {
    return this.transporter.sendMail({
      ...configMail.default,
      ...message,
    });
  }
}

export default new Mail();