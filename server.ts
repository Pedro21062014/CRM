import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Asaas API Key
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const ASAAS_URL = "https://api.asaas.com/v3";

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      if (!ASAAS_API_KEY) {
        return res.status(500).json({ error: "Chave da API do Asaas não configurada no servidor (.env)." });
      }
      const { customerName, customerEmail, customerCpfCnpj, planId, value, cycle } = req.body;

      // 1. Create or find customer in Asaas
      let customerId = "";
      const customersResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customerCpfCnpj}`, {
        headers: {
          "access_token": ASAAS_API_KEY,
          "User-Agent": "NovaStore/1.0"
        }
      });
      const customersText = await customersResponse.text();
      let customersData;
      try { customersData = JSON.parse(customersText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Busca Cliente): ${customersText}` }); }

      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
      } else {
        const createCustomerResponse = await fetch(`${ASAAS_URL}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY,
            "User-Agent": "NovaStore/1.0"
          },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            cpfCnpj: customerCpfCnpj
          })
        });
        const newCustomerText = await createCustomerResponse.text();
        let newCustomerData;
        try { newCustomerData = JSON.parse(newCustomerText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Criação Cliente): ${newCustomerText}` }); }
        
        if (newCustomerData.errors) {
            return res.status(400).json({ error: newCustomerData.errors[0].description });
        }
        customerId = newCustomerData.id;
      }

      // 2. Create subscription
      const subscriptionResponse = await fetch(`${ASAAS_URL}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
          "User-Agent": "NovaStore/1.0"
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED", // Let the user choose PIX, BOLETO, CREDIT_CARD on the checkout page
          value: value,
          nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          cycle: cycle === "MONTHLY" ? "MONTHLY" : "YEARLY",
          description: `Assinatura Plano ${planId}`
        })
      });

      const subscriptionText = await subscriptionResponse.text();
      let subscriptionData;
      try { subscriptionData = JSON.parse(subscriptionText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Assinatura): ${subscriptionText}` }); }
      
      if (subscriptionData.errors) {
          return res.status(400).json({ error: subscriptionData.errors[0].description });
      }

      const paymentsResponse = await fetch(`${ASAAS_URL}/payments?subscription=${subscriptionData.id}`, {
          headers: {
              "access_token": ASAAS_API_KEY,
              "User-Agent": "NovaStore/1.0"
          }
      });
      const paymentsText = await paymentsResponse.text();
      let paymentsData;
      try { paymentsData = JSON.parse(paymentsText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Pagamentos): ${paymentsText}` }); }
      
      if (paymentsData.data && paymentsData.data.length > 0) {
          res.json({ checkoutUrl: paymentsData.data[0].invoiceUrl });
      } else {
          res.status(500).json({ error: "Não foi possível gerar o link de pagamento." });
      }

    } catch (error: any) {
      console.error("Asaas error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/store-checkout", async (req, res) => {
    try {
      if (!ASAAS_API_KEY) {
        return res.status(500).json({ error: "Chave da API do Asaas não configurada no servidor (.env)." });
      }
      const { customerName, customerEmail, customerCpfCnpj, value, description } = req.body;

      // 1. Create or find customer in Asaas
      let customerId = "";
      const customersResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customerCpfCnpj}`, {
        headers: {
          "access_token": ASAAS_API_KEY,
          "User-Agent": "NovaStore/1.0"
        }
      });
      const customersText = await customersResponse.text();
      let customersData;
      try { customersData = JSON.parse(customersText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Busca Cliente): ${customersText}` }); }

      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
      } else {
        const createCustomerResponse = await fetch(`${ASAAS_URL}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY,
            "User-Agent": "NovaStore/1.0"
          },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            cpfCnpj: customerCpfCnpj
          })
        });
        const newCustomerText = await createCustomerResponse.text();
        let newCustomerData;
        try { newCustomerData = JSON.parse(newCustomerText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Criação Cliente): ${newCustomerText}` }); }
        
        if (newCustomerData.errors) {
            return res.status(400).json({ error: newCustomerData.errors[0].description });
        }
        customerId = newCustomerData.id;
      }

      // 2. Create PIX Charge
      const paymentResponse = await fetch(`${ASAAS_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY,
          "User-Agent": "NovaStore/1.0"
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: value,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Due tomorrow
          description: description
        })
      });

      const paymentText = await paymentResponse.text();
      let paymentData;
      try { paymentData = JSON.parse(paymentText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (Cobrança): ${paymentText}` }); }
      
      if (paymentData.errors) {
          return res.status(400).json({ error: paymentData.errors[0].description });
      }

      // 3. Get PIX QR Code
      const qrCodeResponse = await fetch(`${ASAAS_URL}/payments/${paymentData.id}/pixQrCode`, {
          headers: {
              "access_token": ASAAS_API_KEY,
              "User-Agent": "NovaStore/1.0"
          }
      });

      const qrCodeText = await qrCodeResponse.text();
      let qrCodeData;
      try { qrCodeData = JSON.parse(qrCodeText); } catch(e) { return res.status(400).json({ error: `Erro Asaas (QR Code): ${qrCodeText}` }); }

      res.json({ 
          paymentId: paymentData.id,
          qrCodeUrl: `data:image/png;base64,${qrCodeData.encodedImage}`,
          payload: qrCodeData.payload
      });

    } catch (error: any) {
      console.error("Asaas error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/balance", async (req, res) => {
    try {
      if (!ASAAS_API_KEY) {
        return res.status(500).json({ error: "Chave da API do Asaas não configurada no servidor (.env)." });
      }

      const response = await fetch(`${ASAAS_URL}/finance/balance`, {
        headers: {
          "access_token": ASAAS_API_KEY,
          "User-Agent": "NovaStore/1.0"
        }
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(400).json({ error: `Erro Asaas: ${text}` });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Asaas error:", error);
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
      // Serve static files in production
      app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
