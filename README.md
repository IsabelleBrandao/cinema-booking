# Cinema Booking System (High Concurrency)

Sistema de venda de ingressos distribuído, desenvolvido para suportar **alta concorrência**, garantir **consistência estrita** (ACID) e tolerância a falhas.

O projeto resolve problemas clássicos de sistemas distribuídos, como **Race Conditions**, **Deadlocks** e **Double Spending**.

---

## Diferenciais Implementados

Além dos requisitos obrigatórios, este projeto inclui:

* **Rate Limiting:** Proteção contra ataques de força bruta/DDoS (limite de requisições por IP).
* **Dead Letter Queue (DLQ):** Mensagens do Kafka que falham no processamento não são perdidas, garantindo observabilidade.
* **Deadlock Prevention:** Ordenação determinística de recursos antes do travamento no banco.
* **Idempotência:** Garantia de que uma mesma requisição de compra não seja processada duas vezes (chave de idempotência).
* **Swagger/OpenAPI:** Documentação automática da API.
* **Testes E2E:** Validação de fluxos completos de ponta a ponta.

---

## 🛠 Arquitetura e Tecnologias

| Tecnologia | Função | Justificativa |
| :--- | :--- | :--- |
| **NestJS** | Backend Framework | Modularidade, Injeção de Dependência e suporte nativo a Microsserviços. |
| **PostgreSQL** | Banco de Dados | Transações ACID e suporte a **Pessimistic Locking** (`SELECT ... FOR UPDATE`), essencial para evitar vendas duplicadas. |
| **Redis** | Cache Distribuído | Implementação de *Cache-Aside* para leitura rápida de disponibilidade, reduzindo carga no banco. |
| **Apache Kafka** | Mensageria | Processamento assíncrono para tarefas pesadas (envio de e-mail, geração de ticket), desacoplando o fluxo crítico. |
| **Docker** | Infraestrutura | Orquestração de todos os serviços (App, DB, Cache, Broker) em um único comando. |

---

## Decisões de Design (O Desafio)

### 1. O Problema da Concorrência (Race Condition)
**Cenário:** Dois usuários tentam comprar o último assento exatamente ao mesmo tempo.
**Solução:** Utilizamos **Pessimistic Write Lock** (`FOR UPDATE`) no banco de dados. Ao iniciar uma transação de reserva, o banco "trava" as linhas dos assentos solicitados. Qualquer outra transação concorrente é obrigada a aguardar a liberação, garantindo que o `status` do assento seja verificado e atualizado atomicamente.

### 2. Prevenção de Deadlocks
**Cenário:** Usuário A pede assentos [1, 2]. Usuário B pede [2, 1]. Se ambos travarem o primeiro item ao mesmo tempo, ocorrerá um Deadlock ao tentarem o segundo.
**Solução:** Implementamos uma **ordenação prévia** dos IDs dos assentos antes de solicitar o bloqueio no banco. Assim, todas as transações sempre tentam adquirir recursos na mesma ordem (sempre 1 depois 2), eliminando a possibilidade de dependência circular.

### 3. Consistência em Junções (TypeORM)
**Desafio:** O PostgreSQL não permite `FOR UPDATE` em tabelas com *Nullable Side* (Left Joins).
**Solução:** Forçamos o uso de `INNER JOIN` nas consultas críticas de pagamento, garantindo que o banco possa travar as linhas relacionadas com segurança.

---

## Como Executar

### Pré-requisitos
* Docker e Docker Compose instalados.

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/IsabelleBrandao/cinema-booking.git
    cd cinema-booking
    ```

2.  **Suba o ambiente:**
    ```bash
    docker-compose up --build
    ```

3.  **Aguarde a inicialização:**
    O sistema estará pronto quando você vir os logs `Nest application successfully started`.
    * **API:** `http://localhost:3000`
    * **Swagger:** `http://localhost:3000/api-docs`

---

## Como Testar

### 1. Via Swagger (Manual)
Acesse [http://localhost:3000/api-docs](http://localhost:3000/api-docs).
1.  Crie uma Sessão (`POST /sessions`).
2.  Copie o ID da sessão.
3.  Faça uma Reserva (`POST /reservations`).
4.  Confirme o Pagamento (`POST /reservations/confirm-payment`).

### 2. Teste de Concorrência (Script)
Para validar a robustez do sistema, você pode simular requisições simultâneas.
*Se 2 requisições tentarem reservar o mesmo assento ao mesmo tempo:*
* Uma receberá **201 Created**.
* A outra receberá **409 Conflict** (corretamente bloqueada).

---

## Endpoints Principais

### Sessões
* `POST /sessions` - Cria nova sessão (Filme, Sala, Horário).
* `GET /sessions/:id/seats` - Busca mapa de assentos (com cache Redis).

### Reservas
* `POST /reservations` - Reserva assentos temporariamente (30s).
* `POST /reservations/confirm-payment` - Confirma venda e dispara eventos Kafka.
* `DELETE /reservations/:id` - Cancelamento manual (libera assento imediatamente).

---

## Melhorias Futuras

* Implementar autenticação JWT/OAuth2.
* Dashboard de monitoramento (Grafana/Prometheus) para métricas do Kafka.
* Webhooks para notificação de parceiros externos.

---
**Desenvolvido por Isabelle Brandão** 
