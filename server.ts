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
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI3NjhiOWRiLTdmODEtNGQ2Ny05MGE0LWIyMTA4NTZhMzJhNTo6JGFhY2hfZTkzMDYzYzQtZTRlNC00M2U5LTgzNGEtNjZmZWUwNzE5NDZm";
  const ASAAS_URL = "https://api.asaas.com/v3";

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const { customerName, customerEmail, customerCpfCnpj, planId, value, cycle } = req.body;

      // 1. Create or find customer in Asaas
      let customerId = "";
      const customersResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customerCpfCnpj}`, {
        headers: {
          "access_token": ASAAS_API_KEY
        }
      });
      const customersData = await customersResponse.json();

      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
      } else {
        const createCustomerResponse = await fetch(`${ASAAS_URL}/customers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY
          },
          body: JSON.stringify({
            name: customerName,
            email: customerEmail,
            cpfCnpj: customerCpfCnpj
          })
        });
        const newCustomerData = await createCustomerResponse.json();
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
          "access_token": ASAAS_API_KEY
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

      const subscriptionData = await subscriptionResponse.json();
      
      if (subscriptionData.errors) {
          return res.status(400).json({ error: subscriptionData.errors[0].description });
      }

      // Return the invoice URL to redirect the user
      // Since billingType is UNDEFINED, Asaas generates a payment link
      // Wait, Asaas subscriptions don't return an invoiceUrl directly on creation, we need to get the first payment
      // Let's create a payment link instead, or fetch the first installment
      
      // Actually, creating a payment link is easier for subscriptions if we want a hosted checkout
      // Or we can just create a payment (charge) if it's a one-time, but it's a subscription.
      // Let's get the first payment of the subscription
      const paymentsResponse = await fetch(`${ASAAS_URL}/payments?subscription=${subscriptionData.id}`, {
          headers: {
              "access_token": ASAAS_API_KEY
          }
      });
      const paymentsData = await paymentsResponse.json();
      
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
