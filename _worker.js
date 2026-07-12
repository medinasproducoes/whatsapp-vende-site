// _worker.js — ponto de entrada único do Worker (roteia API + serve o site estático)

async function criarPagamento(request) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const SITE_URL = new URL(request.url).origin;
    const orderNsu = `wpp-vende-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      handle: 'medina_pay',
      items: [{ quantity: 1, price: 3790, description: 'WhatsApp que Vende Todo Dia - Ebook' }],
      order_nsu: orderNsu,
      redirect_url: `${SITE_URL}/obrigado.html`,
      webhook_url: `${SITE_URL}/api/webhook-infinitepay`
    };

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) return new Response(JSON.stringify({ error: 'Não foi possível gerar o link', details: data }), { status: 502, headers });

    const paymentUrl = data.url || data.payment_url || data.link || data.checkout_url;
    if (!paymentUrl) return new Response(JSON.stringify({ error: 'Sem link de pagamento na resposta' }), { status: 502, headers });

    return new Response(JSON.stringify({ url: paymentUrl, order_nsu: orderNsu }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers });
  }
}

async function verificarPagamento(request) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { handle, order_nsu, transaction_nsu, slug } = await request.json();
    if (!handle || !order_nsu || !transaction_nsu || !slug) {
      return new Response(JSON.stringify({ paid: false, error: 'Parâmetros incompletos' }), { status: 400, headers });
    }
    const response = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, order_nsu, transaction_nsu, slug })
    });
    if (!response.ok) return new Response(JSON.stringify({ paid: false, error: 'Erro ao verificar' }), { status: 200, headers });
    const data = await response.json();
    return new Response(JSON.stringify({
      paid: data.paid === true && data.success === true,
      amount: data.paid_amount,
      receipt: data.receipt_url || null
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ paid: false, error: 'Erro interno' }), { status: 200, headers });
  }
}

async function webhookInfinitePay(request) {
  try {
    const data = await request.json();
    console.log('Venda confirmada (WhatsApp que Vende):', data.order_nsu, data.paid_amount);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/create-payment') return criarPagamento(request);
    if (request.method === 'POST' && url.pathname === '/api/verify-payment') return verificarPagamento(request);
    if (request.method === 'POST' && url.pathname === '/api/webhook-infinitepay') return webhookInfinitePay(request);
    return env.ASSETS.fetch(request);
  }
};
