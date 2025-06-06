import nodemailer from 'nodemailer';
import _ from 'lodash';
import {getLogger} from "./logger";

let mailSender, mailConfig: any;

function initMailSender() {
  try {
    mailConfig = {
      host: process.env.EMAIL_HOST,
      port: +process.env.EMAIL_PORT || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      secureConnection: process.env.EMAIL_SECURE,
      secure: process.env.EMAIL_SECURE, // process.env.NODE_ENV === 'production',
      tls: {ciphers: 'SSLv3'},
    }
    getLogger().info('[email] init mail config')
    mailSender = nodemailer.createTransport(mailConfig)
  } catch (e) {
    getLogger().error(e.message, {fn: 'email::init'})
  }
}

export const sendEmail = ({to, subject, html = undefined, text = undefined}) => {
  if (!mailSender) {
    initMailSender()
  }
  return new Promise((resolve, reject) => {
    if (!mailConfig.auth.user || !mailConfig.auth.pass) {
      getLogger().error('[email] You need to provide EMAIL_USER and EMAIL_PASSWORD environment variables for sending emails.');
      return resolve('An error occurred while sending an email: (Credentials missing).');
    }

    let from = `"No Reply" <${
      mailConfig.auth.user.includes('@')
        ? mailConfig.auth.user
        : `${mailConfig.auth.user}@${process.env.EMAIL_FROM_DOMAIN}`
    }>`
    const mailData = _.omitBy({
      from,
      to,
      subject,
      html,
      text
    }, _.isNil)
    mailSender.sendMail(mailData, function (err, info) {
        if (err) {
          getLogger().error('email-util', err);
          return reject(err);
        } else {
          return resolve(info);
        }
      }
    );
  });
};

export const buildEmailPayload = (metadata: { content: string, to: string, subject: string }) => {
  return {
    to: metadata.to,
    subject: metadata.subject,
    html: `
<!doctype html>
<html>
   <head>
     <meta name="viewport" content="width=device-width">
     <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
     <title>${metadata.subject}</title>
   </head>
   <body>
     <pre style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">${metadata.content}</pre>
    </body>
</html>
`
  }
}
