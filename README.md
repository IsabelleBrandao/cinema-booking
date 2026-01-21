#  Cinema Booking System (Desafio Backend)

Solução robusta para um sistema de venda de ingressos distribuído, focado em resolver problemas de **alta concorrência (Race Conditions)** e garantir integridade de dados em ambientes escaláveis.

##  Visão Geral

O sistema gerencia o ciclo de vida de venda de ingressos (**Sessão** → **Reserva** → **Pagamento**), garantindo que **nenhum assento seja vendido duas vezes**, mesmo que milhares de usuários cliquem no botão de compra no mesmo milissegundo.

A arquitetura segue o padrão **Event-Driven** (Orientada a Eventos) para processos secundários e **Strict Consistency** (Consistência Estrita) para o núcleo da transação.

---

## 🛠 Tecnologias e Decisões Arquiteturais

### 1. Core & Framework
* **Node.js & NestJS:** Escolhido pela arquitetura modular, injeção de dependência nativa e facilidade de integração com microsserviços.
* **Docker & Docker Compose:** Orquestração completa do ambiente (App, BD, Broker, Cache) com um único comando.

### 2. Persistência e Concorrência (PostgreSQL)
* **Banco Relacional (ACID):** Essencial para evitar estados inconsistentes em transações financeiras.
* **Estratégia de Concorrência (Pessimistic Locking):**
    * *A Decisão:* Utilizamos `SELECT ... FOR UPDATE` (Lock Pessimista) durante a criação da reserva.
    * *Por quê?* Em cenários de altíssima disputa (como estreia de filmes), o *Optimistic Locking* geraria muitas falhas de retry para o usuário. O Lock Pessimista enfileira as requisições no banco, garantindo que a primeira vença e as seguintes recebam feedback imediato, sem corromper dados.

### 3. Performance e Cache (Redis)
* **Padrão Cache-Aside:** Consultas de disponibilidade (`GET /seats`) verificam primeiro o Redis. Se houver "cache miss", buscam no banco e populam o cache.
* **Invalidação Inteligente:** O cache da sessão é invalidado automaticamente sempre que uma nova reserva é confirmada, garantindo consistência eventual rápida.

### 4. Mensageria Assíncrona (Apache Kafka)
* **Desacoplamento:** O fluxo de "Reserva" não espera o envio de e-mails ou geração de PDF.
* **Tópicos Implementados:**
    * `reservation.created`: Aciona simulação de envio de e-mail.
    * `payment.confirmed`: Aciona geração de ticket.
    * `seat.released`: Logs de auditoria.

### 5. Resiliência
* **Idempotência:** O endpoint de reserva exige uma `idempotency_key`. Se o cliente reenviar a requisição por timeout, o sistema impede a duplicidade.
* **Cron Jobs:** Um job em background roda a cada 10 segundos para liberar assentos de reservas não pagas (expiradas).

---

##  Como Executar

### Pré-requisitos
* Docker e Docker Compose instalados.
* Portas livres: `3000` (API), `5432` (Postgres), `6379` (Redis), `9092` (Kafka).

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/IsabelleBrandao/cinema-booking.git](https://github.com/IsabelleBrandao/cinema-booking.git)
    cd cinema-booking
    ```

2.  **Suba o ambiente:**
    ```bash
    docker-compose up --build
    ```

3.  **Aguarde a inicialização:**
    Espere pela mensagem `Nest application successfully started` no terminal.

4.  **Acesse a Documentação (Swagger):**
     [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

##  Roteiro de Teste (Sugestão para Avaliação)

Para validar a concorrência e o fluxo distribuído, recomendo seguir estes passos via Swagger:

### Passo 1: Preparar o Terreno
1.  Vá em `POST /sessions`.
2.  Clique em "Try it out" e execute (pode usar os dados padrão).
3.  Copie o UUID retornado no campo `id`.

### Passo 2: Testar Concorrência (O Desafio)
1.  Vá em `POST /reservations`.
2.  Cole o ID da sessão em `session_id`.
3.  Defina os assentos (ex: `["A1", "A2"]`).
4.  Execute a requisição. **Retorno:** `201 Created`.
5.  **Imediatamente**, tente executar a mesma requisição novamente (simulando um "duplo clique" ou outro usuário).
    * **Resultado Esperado:** O sistema deve retornar `409 Conflict`, provando que o Lock funcionou e impediu a venda dupla.

### Passo 3: Fluxo Assíncrono (Kafka)
1.  Confirme o pagamento usando o ID da reserva em `POST /reservations/confirm-payment`.
2.  Olhe o terminal onde o Docker está rodando. Você verá logs coloridos do consumidor Kafka:
    ```text
     [EMAIL] Enviando confirmação de reserva...
     [TICKET] Gerando ingresso para a venda...
    ```

---

##  Endpoints Principais

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/sessions` | Cria sessão e gera matriz de assentos |
| `GET` | `/sessions/:id/seats` | Busca assentos livres (Cache Redis) |
| `POST` | `/reservations` | Reserva assentos (**Atomic Transaction + Lock**) |
| `POST` | `/reservations/confirm-payment` | Finaliza a compra |
| `GET` | `/reservations/user/:id/purchases` | Histórico do usuário |

---

##  Melhorias Futuras

* [ ] **Dead Letter Queue (DLQ):** Tratamento robusto para mensagens Kafka que falharem.
* [ ] **Testes E2E:** Implementar testes automatizados simulando alta carga com JMeter ou K6.
* [ ] **Autenticação:** Adicionar JWT e Guards para proteger rotas administrativas.

---
*Desenvolvido para o Desafio Técnico Backend*