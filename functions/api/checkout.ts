export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { customerName, customerEmail, customerCpfCnpj, planId, value, cycle } = body;

    const ASAAS_API_KEY = env.ASAAS_API_KEY || "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI3NjhiOWRiLTdmODEtNGQ2Ny05MGE0LWIyMTA4NTZhMzJhNTo6JGFhY2hfZTkzMDYzYzQtZTRlNC00M2U5LTgzNGEtNjZmZWUwNzE5NDZm";
    const ASAAS_URL = "https://api.asaas.com/v3";

    // 1. Create or find customer
    let customerId = "";
    const customersResponse = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${customerCpfCnpj}`, {
      headers: {
        "access_token": ASAAS_API_KEY
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
          "access_token": ASAAS_API_KEY
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

    // 2. Create subscription
    const subscriptionResponse = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
        value: value,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        cycle: cycle === "MONTHLY" ? "MONTHLY" : "YEARLY",
        description: `Assinatura Plano ${planId}`
      })
    });

    const subscriptionText = await subscriptionResponse.text();
    let subscriptionData;
    try {
        subscriptionData = JSON.parse(subscriptionText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Erro na API Asaas (Assinatura): ${subscriptionText}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }
    
    if (subscriptionData.errors) {
        return new Response(JSON.stringify({ error: subscriptionData.errors[0].description }), { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        });
    }

    const paymentsResponse = await fetch(`${ASAAS_URL}/payments?subscription=${subscriptionData.id}`, {
        headers: {
            "access_token": ASAAS_API_KEY
        }
    });
    
    const paymentsText = await paymentsResponse.text();
    let paymentsData;
    try {
        paymentsData = JSON.parse(paymentsText);
    } catch (e) {
        return new Response(JSON.stringify({ error: `Erro na API Asaas (Pagamentos): ${paymentsText}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }
    
    if (paymentsData.data && paymentsData.data.length > 0) {
        return new Response(JSON.stringify({ checkoutUrl: paymentsData.data[0].invoiceUrl }), { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        });
    } else {
        return new Response(JSON.stringify({ error: "Não foi possível gerar o link de pagamento." }), { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
