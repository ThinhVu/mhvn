import admin from 'firebase-admin';

let serviceAccount, credential, app;

try {
  // const serviceAccount = {
  //    "type": "service_account",
  //    "project_id": "mevn-9862d",
  //    "private_key_id": "4f5ad...",
  //    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...==\n-----END PRIVATE KEY-----\n",
  //    "client_email": "xxx.iam.gserviceaccount.com",
  //    "client_id": "11125...",
  //    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  //    "token_uri": "https://oauth2.googleapis.com/token",
  //    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  //    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/xxx.iam.gserviceaccount.com",
  //    "universe_domain": "googleapis.com"
  // }
  serviceAccount = { /*your firebase app*/}
  if (serviceAccount.private_key) {
    // @ts-ignore
    credential = admin.credential.cert(serviceAccount)
    app = admin.initializeApp({credential})
  }
} catch (e) {
  console.error('[notification] [fcm] failed to initialize')
}

export default app
