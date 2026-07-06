// netlify/functions/create-payment.js
// Gera o link de pagamento da InfinitePay via POST (forma correta, conforme documentação oficial)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const SITE_URL = 'https://whasapp-que-vende-todo-dia.netlify.app';

    // Gera um order_nsu único para rastrear esta compra específica
    const orderNsu = `wpp-vende-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      handle: 'medina_pay',
      items: [
        {
          quantity: 1,
          price: 3790, // R$ 37,90 em centavos
          description: 'WhatsApp que Vende Todo Dia - Ebook'
        }
      ],
      order_nsu: orderNsu,
      redirect_url: `${SITE_URL}/obrigado.html`,
      webhook_url: `${SITE_URL}/.netlify/functions/webhook-infinitepay`
    };

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('InfinitePay create link error:', data);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Não foi possível gerar o link de pagamento', details: data })
      };
    }

    const paymentUrl = data.url || data.payment_url || data.link || data.checkout_url;

    if (!paymentUrl) {
      console.error('Resposta sem URL de pagamento:', data);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Resposta da InfinitePay sem link de pagamento', raw: data })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: paymentUrl, order_nsu: orderNsu })
    };

  } catch (err) {
    console.error('Erro ao criar link de pagamento:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao gerar link de pagamento' })
    };
  }
};
