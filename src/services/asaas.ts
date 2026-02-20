"use client";

const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_TOKEN = process.env.ASAAS_TOKEN;

export const createPaymentLink = async (planName: string, price: number, customerEmail: string) => {
  try {
    // Nota: Em produção, estas chamadas devem ser feitas via Backend/Cloud Functions
    // para não expor o Token do Asaas no Frontend e evitar erros de CORS.
    const response = await fetch(`${ASAAS_API_URL}/paymentLinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_TOKEN || ''
      },
      body: JSON.stringify({
        name: `Assinatura Plano ${planName} - NovaCRM`,
        description: `Acesso completo às funcionalidades do plano ${planName}`,
        value: price,
        billingType: 'UNDEFINED', // Permite Boleto, Cartão ou PIX
        chargeType: 'RECURRENT',
        period: 'MONTHLY'
      })
    });

    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].description);
    
    return data.url;
  } catch (error: any) {
    console.error("Erro Asaas:", error);
    throw error;
  }
};