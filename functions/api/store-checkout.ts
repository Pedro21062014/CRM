export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { customerName, customerEmail, customerCpfCnpj, value, description } = body;

    const ASAAS_API_KEY = env.ASAAS_API_KEY;
    const ASAAS_URL = "https://sandbox.asaas.com/api/v3"; // Use sandbox or production based on your key

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave da API do Asaas não configurada no servidor." }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 1. Create or find customer
    let customerId = "";
    const customersResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customerCpfCnpj}`, {
      headers: {
        "access_token": ASAAS_API_KEY,
        "User-Agent": "NovaStore/1.0"
      }
    });
    
    const customersText = await customersResponse.text();
    let customersData;
    try {
        customersData = JSON.parse(customersText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Erro na API Asaas (Busca Cliente): ${customersText}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }

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
      try {
          newCustomerData = JSON.parse(newCustomerText);
      } catch (e) {
          return new Response(JSON.stringify({ error: `Erro na API Asaas (Criação Cliente): ${newCustomerText}` }), { 
              status: 400, 
              headers: { "Content-Type": "application/json" } 
          });
      }
      
      if (newCustomerData.errors) {
          return new Response(JSON.stringify({ error: newCustomerData.errors[0].description }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
          });
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
    try {
        paymentData = JSON.parse(paymentText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Erro na API Asaas (Cobrança): ${paymentText}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }
    
    if (paymentData.errors) {
        return new Response(JSON.stringify({ error: paymentData.errors[0].description }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
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
    try {
        qrCodeData = JSON.parse(qrCodeText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Erro na API Asaas (QR Code): ${qrCodeText}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    return new Response(JSON.stringify({ 
        paymentId: paymentData.id,
        qrCodeUrl: qrCodeData.encodedImage,
        payload: qrCodeData.payload
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
