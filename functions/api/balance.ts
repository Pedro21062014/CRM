export async function onRequestGet(context: any) {
  try {
    const { env } = context;
    const ASAAS_API_KEY = env.ASAAS_API_KEY;
    const ASAAS_URL = "https://api.asaas.com/v3";

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave da API do Asaas não configurada." }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
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
        return new Response(JSON.stringify({ error: `Erro na API Asaas: ${text}` }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" } 
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
