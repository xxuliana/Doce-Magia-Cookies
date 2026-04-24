import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import axios from "axios";
import Stripe from "stripe";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook Endpoint
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (!sig || !endpointSecret) {
        throw new Error("Missing stripe-signature or endpoint secret");
      }
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`❌ Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 Pagamento recebido: ${paymentIntent.id}`);
        break;
      case "payment_intent.payment_failed":
        console.log("❌ Pagamento falhou.");
        break;
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Route: Send Welcome Email
  app.post("/api/welcome-email", async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and Name are required" });
    }

    const user = process.env.EMAIL_USER || "docemagiacookies@gmail.com";
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : null;

    if (!process.env.EMAIL_PASS) {
      console.warn("⚠️ EMAIL_PASS não configurado no .env. Ignorando envio de e-mail real.");
      return res.status(200).json({ 
        status: "skipped", 
        message: "Credenciais SMTP (EMAIL_PASS) não configuradas nas variáveis de ambiente." 
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass || "" },
    });

    try {
      // Verificar conexão com o SMTP antes de tentar enviar
      await transporter.verify();
      
      const mailOptions = {
        from: `"Doce&Magia Cookie's" <${user}>`,
        to: email,
        subject: "Bem-vindo(a)! Seu cadastro foi realizado com sucesso 🎉",
        html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #fce7f3; border-radius: 24px; overflow: hidden; color: #431407;">
          <div style="background-color: #fce7f3; padding: 0;">
            <img src="https://picsum.photos/seed/bakery/1200/400" alt="Doce&Magia Banner" style="width: 100%; height: auto; display: block;" />
          </div>
          
          <div style="padding: 40px;">
            <h2 style="color: #be185d; font-size: 24px; font-weight: 800; margin-top: 0;">Olá, ${name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #431407;">
              Seu cadastro foi realizado com sucesso! ✨ Ficamos muito felizes em ter você por aqui.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #431407;">
              Agora você já pode aproveitar todos os benefícios exclusivos que preparamos pra você, como:
            </p>
            
            <ul style="list-style: none; padding: 0; margin: 20px 0;">
              <li style="margin-bottom: 12px; display: flex; align-items: center;">
                <span style="background-color: #fdf2f8; color: #be185d; border-radius: 8px; padding: 8px; margin-right: 12px; font-weight: bold;">🎁</span>
                Cupons de desconto especiais
              </li>
              <li style="margin-bottom: 12px; display: flex; align-items: center;">
                <span style="background-color: #fdf2f8; color: #be185d; border-radius: 8px; padding: 8px; margin-right: 12px; font-weight: bold;">💎</span>
                Programas de fidelidade
              </li>
              <li style="margin-bottom: 12px; display: flex; align-items: center;">
                <span style="background-color: #fdf2f8; color: #be185d; border-radius: 8px; padding: 8px; margin-right: 12px; font-weight: bold;">🛍️</span>
                Ofertas e novidades em primeira mão
              </li>
            </ul>
            
            <p style="font-size: 16px; line-height: 1.6; color: #431407;">
              Nossa missão é tornar sua experiência a melhor possível — e isso começa agora!
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #431407;">
              Se precisar de qualquer ajuda, estamos à disposição 😊
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #431407; margin-bottom: 0;">
              Seja muito bem-vindo(a)!
            </p>
            
            <div style="margin-top: 40px; border-top: 1px solid #fecdd3; padding-top: 20px;">
              <p style="font-size: 14px; font-weight: 800; color: #be185d; margin: 0;">Atenciosamente,</p>
              <p style="font-size: 14px; font-weight: 800; color: #431407; margin: 0;">Equipe Doce&Magia Cookie’s</p>
            </div>
          </div>
          
          <div style="background-color: #fff1f2; padding: 20px; text-align: center; border-top: 1px solid #fecdd3;">
            <p style="font-size: 11px; color: #9d174d; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">
              ✦ Cookies Artesanais Feitos com Magia ✦
            </p>
          </div>
        </div>
      `,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error.message);
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });

  // API Route: Send WhatsApp Notification (Automated)
  app.post("/api/send-whatsapp", async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "To and Message are required" });
    }

    // Clean phone number
    const targetPhone = to.replace(/\D/g, "");

    // Integration Logic (Placeholder for real API)
    // Common providers: Twilio, Z-API, UltraMsg, Evolution API
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!apiUrl || !apiKey) {
      console.warn("WHATSAPP_API_URL or WHATSAPP_API_KEY not set. Skipping automated message.");
      return res.status(200).json({ status: "skipped", message: "API credentials not configured" });
    }

    try {
      // This is a generic implementation. Adjust based on provider docs.
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`, // Standard Authorization
          "apikey": apiKey, // Some providers use this header
          "x-api-key": apiKey, // Others use this
        },
        body: JSON.stringify({
          number: targetPhone,
          to: targetPhone,
          message: message,
          text: message, // Different APIs use different keys
        }),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API responded with status ${response.status}`);
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("WhatsApp Send Error:", error.message);
      res.status(500).json({ error: "Failed to send WhatsApp message" });
    }
  });

  // API Route: Create Stripe Payment Intent (Card or Pix)
  app.post("/api/create-stripe-intent", async (req, res) => {
    try {
      const { amount, customer, paymentMethod } = req.body;

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY not configured");
      }

      const intentConfig: any = {
        amount: Math.round(amount * 100),
        currency: "brl",
        payment_method_types: paymentMethod === "pix" ? ["pix"] : ["card"],
        receipt_email: customer.email,
        metadata: {
          clientName: customer.name,
          clientPhone: customer.phone,
        },
      };

      // Add Pix specific options if Pix is chosen
      if (paymentMethod === "pix") {
        intentConfig.payment_method_options = {
          pix: {
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          },
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(intentConfig);

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Stripe Intent Error:", error.message);
      
      // Provide a more helpful error for PIX activation
      if (error.message.includes("pix") || error.message.includes("payment_method_type")) {
        return res.status(400).json({ 
          error: "O Pix não está ativado na sua conta Stripe. Por favor, ative-o em: https://dashboard.stripe.com/settings/payments",
          code: "pix_not_activated"
        });
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
