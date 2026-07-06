// netlify/functions/verify-payment.js
// Recebe os parâmetros do redirect da InfinitePay e verifica se o pagamento foi aprovado

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { handle, order_nsu, transaction_nsu, slug } = JSON.parse(event.body);

    if (!handle || !order_nsu || !transaction_nsu || !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ paid: false, error: 'Parâmetros incompletos' })
      };
    }

    const response = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, order_nsu, transaction_nsu, slug })
    });

    if (!response.ok) {
      console.error('InfinitePay API error:', response.status);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ paid: false, error: 'Erro ao verificar pagamento' })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paid: data.paid === true && data.success === true,
        amount: data.paid_amount,
        method: data.capture_method,
        receipt: data.receipt_url || null
      })
    };

  } catch (err) {
    console.error('Verify payment error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ paid: false, error: 'Erro interno' })
    };
  }
};
