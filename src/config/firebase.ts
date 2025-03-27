import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    // Crear el objeto serviceAccount con la estructura correcta
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: 'your-private-key-id', // Opcional
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: '', // Opcional
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
        process.env.FIREBASE_CLIENT_EMAIL || ''
      )}`
    };

    // Validación de campos requeridos
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Faltan credenciales requeridas de Firebase');
    }

    console.log('Iniciando Firebase Admin con:', {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKeyPresent: !!serviceAccount.private_key
    });

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });

    db = app.firestore();
    
    // Verificar la conexión
    db.collection('test').doc('test').set({ 
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true })
      .then(() => console.log('Conexión a Firestore verificada'))
      .catch(error => {
        console.error('Error de conexión:', error);
        // No lanzar el error, solo registrarlo
      });

  } catch (error) {
    console.error('Error de inicialización de Firebase:', error);
    throw error;
  }
} else {
  db = admin.firestore();
}

export { db };
export const auth = admin.auth();
export default admin;
