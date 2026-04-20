import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Welcome Email
  app.post("/api/welcome-email", async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and Name are required" });
    }

    const user = process.env.EMAIL_USER || "docemagiacookies@gmail.com";
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : null;

    if (!pass) {
      console.warn("EMAIL_PASS not set. Skipping real email sending.");
      return res.status(200).json({ status: "skipped", message: "SMTP credentials not configured" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

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

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send email" });
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

  // API Route: Create Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "brl", paymentMethodTypes = ["card"], installments = 1 } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const stripe = getStripe();
      
      const paymentMethodOptions: any = {
        pix: {
          expires_after_seconds: 600, // 10 minutes
        },
      };

      if (installments > 1) {
        paymentMethodOptions.card = {
          installments: {
            enabled: true,
            plan: {
              count: installments,
              type: "fixed_count",
            }
          }
        };
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency,
        payment_method_types: paymentMethodTypes,
        payment_method_options: paymentMethodOptions,
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Stripe error:", error.message);
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
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
