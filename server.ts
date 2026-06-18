import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin dynamically using applet config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Admin App
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const auth = getAuth();
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseConfig.firestoreDatabaseId)
  : getFirestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to completely delete a user (Auth + Firestore)
  app.post('/api/delete-user', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Niste autorizovani (nedostaje token).' });
      }
      const idToken = authHeader.split('Bearer ')[1];

      // Verify the ID token to authenticate the administrator
      const decodedToken = await auth.verifyIdToken(idToken);
      const adminUid = decodedToken.uid;

      // Ensure the verifying user has "admin" role in Firestore users collection
      const adminDoc = await db.collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();

      // We also check for fallback in case the first user is a predefined admin or hardcoded email check
      const isAdminUser = 
        adminData?.role === 'admin' || 
        decodedToken.email === 'andrija.t2010@gmail.com';

      if (!isAdminUser) {
        return res.status(403).json({ error: 'Nemate privilegije za permanentno brisanje naloga. Morate imati ulogu "admin".' });
      }

      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: 'Nedostaje ID nalaženog urednika.' });
      }

      if (uid === 'admin_predefined') {
        return res.status(400).json({ error: 'Nije moguće obrisati podrazumevani sistemski nalog.' });
      }

      console.log(`Pokrećem trajno brisanje korisnika ${uid}...`);

      // 1. Delete user from Firebase Authentication
      try {
        await auth.deleteUser(uid);
        console.log(`Uspešno obrisan uid ${uid} iz Firebase Auth.`);
      } catch (authErr: any) {
        // If they already don't exist in Auth (e.g. manual delete in Auth console, but in DB they did), we proceed
        if (authErr.code !== 'auth/user-not-found') {
          throw authErr;
        }
        console.log(`Korisnik ${uid} već nema Auth nalog, prelazi se na brisanje iz Firestore.`);
      }

      // 2. Clear credentials document from Firestore
      await db.collection('users').doc(uid).delete();
      console.log(`Uspešno obrisan dokument users/${uid} iz Firestore.`);

      res.json({ success: true, message: `Urednik je uspešno i trajno obrisan iz sistema.` });
    } catch (error: any) {
      console.error('API Error in delete-user:', error);
      res.status(500).json({ error: error.message || 'Interna greška na serveru.' });
    }
  });

  // Serve main development environment resources or built distribution
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer();
