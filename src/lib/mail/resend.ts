import { Resend } from 'resend';

// Singleton — réutilisé dans toutes les routes API
const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;
