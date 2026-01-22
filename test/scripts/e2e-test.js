// Executar com: node e2e-test.js
const { randomUUID } = require('crypto'); 

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('INICIANDO TESTE DE PONTA A PONTA (E2E)...\n');

  try {
    // 1. CRIAR SESSÃO (CENÁRIO BASE)
    console.log('[SETUP] Criando Sessão...');
    const sessionRes = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movie_name: "Oppenheimer E2E",
        room_name: "IMAX Test",
        start_time: new Date(Date.now() + 86400000).toISOString(), 
        end_time: new Date(Date.now() + 90000000).toISOString(),
        ticket_price: 50.00,
        total_seats: 20
      })
    });
    
    if (!sessionRes.ok) {
        const err = await sessionRes.json();
        throw new Error(`Falha ao criar sessão: ${JSON.stringify(err)}`);
    }
    const session = await sessionRes.json();
    console.log(`Sessão criada: ${session.id}\n`);

    // 2. HAPPY PATH: RESERVA BÁSICA
    console.log('[FLUXO] Reserva Normal...');
    // UUID Válido gerado na hora
    const userHappyId = randomUUID(); 

    const resHappy = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userHappyId, 
        session_id: session.id,
        seat_numbers: ["A1", "A2"],
        idempotency_key: `key-happy-${Date.now()}`
      })
    });
    
    const happyData = await resHappy.json();
    
    if (resHappy.status === 201) {
      console.log(`Reserva criada com sucesso! ID: ${happyData[0].id}`);
    } else {
      console.error('Falha na reserva normal:', happyData);
      return; 
    }
    console.log('');

    // 3. TESTE DE CONCORRÊNCIA (DOUBLE BOOKING)
    console.log('Tentando reservar "A3" com 2 usuários ao mesmo tempo...');
    
    const userRaceA = randomUUID();
    const userRaceB = randomUUID();

    const req1 = fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userRaceA,
        session_id: session.id,
        seat_numbers: ["A3"],
        idempotency_key: `key-race-A-${Date.now()}`
      })
    });

    const req2 = fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userRaceB,
        session_id: session.id,
        seat_numbers: ["A3"], // MESMO ASSENTO!
        idempotency_key: `key-race-B-${Date.now()}`
      })
    });

    const [resp1, resp2] = await Promise.all([req1, req2]);
    
    if ((resp1.status === 201 && resp2.status === 409) || (resp1.status === 409 && resp2.status === 201)) {
      console.log(`SUCESSO: Status recebidos [${resp1.status}, ${resp2.status}] - O sistema bloqueou a duplicidade!`);
    } else {
      console.error(`FALHA: Status inesperados -> Req1: ${resp1.status}, Req2: ${resp2.status}`);
      console.log('Body 1:', await resp1.json().catch(() => ''));
      console.log('Body 2:', await resp2.json().catch(() => ''));
    }
    console.log('');

    // 4. CANCELAMENTO MANUAL
    console.log('[FEATURE] Testando Cancelamento Manual...');
    if (happyData && happyData[0]) {
        const resIdToCancel = happyData[0].id;
        
        const cancelRes = await fetch(`${BASE_URL}/reservations/${resIdToCancel}`, {
          method: 'DELETE'
        });

        if (cancelRes.status === 200 || cancelRes.status === 204) {
          console.log(`Reserva ${resIdToCancel} cancelada com sucesso.`);
          
          // Tentar reservar de novo o A1
          const userRetry = randomUUID();
          const resRetry = await fetch(`${BASE_URL}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userRetry,
              session_id: session.id,
              seat_numbers: ["A1"], 
              idempotency_key: `key-retry-${Date.now()}`
            })
          });
          
          if (resRetry.status === 201) console.log('✅ Assento A1 recuperado e reservado novamente!');
          else console.error('Falha ao reservar assento cancelado:', await resRetry.json());

        } else {
          console.error('Falha ao cancelar reserva:', cancelRes.status);
        }
    } else {
        console.log('Pulo do teste de cancelamento pois a reserva inicial falhou.');
    }
    console.log('');

    // 5. RATE LIMITING
    console.log('   Enviando 15 requisições rápidas (Limite é 10)...');
    
    let blocked = false;
    for (let i = 1; i <= 15; i++) {
      const resLimit = await fetch(`${BASE_URL}/sessions`, { method: 'GET' });
      process.stdout.write(`${resLimit.status} `);
      if (resLimit.status === 429) blocked = true;
    }
    console.log('');
    
    if (blocked) console.log('SUCESSO: O sistema respondeu 429 (Too Many Requests)!');
    else console.error('FALHA: O sistema não bloqueou.');
    console.log('');

    // 6. CONFIRMAÇÃO DE PAGAMENTO
    console.log('[INTEGRAÇÃO] Confirmando Pagamento...');
    
    // Criar nova reserva para pagar
    const userPayer = randomUUID();
    const resPay = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userPayer,
        session_id: session.id,
        seat_numbers: ["B5"], // MUDAR DE "C1" PARA "B5"
        idempotency_key: `key-payer-${Date.now()}`
      })
    });
    
    if (resPay.status === 201) {
        const payData = await resPay.json();
        const payResId = payData[0].id;

        const confirmRes = await fetch(`${BASE_URL}/reservations/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: payResId,
            payment_id: "stripe_conf_999"
          })
        });

        if (confirmRes.status === 200 || confirmRes.status === 201) {
          console.log('Pagamento confirmado!');
          console.log('Ticket gerado:', await confirmRes.json()); 
        } else {
          console.error('Falha no pagamento:', await confirmRes.json());
        }
    } else {
        console.error('Falha ao criar reserva para pagamento:', await resPay.json());
    }

  } catch (error) {
    console.error('\nERRO CRÍTICO NO SCRIPT:', error.message);
  }
}

runTest();