# Cinema Booking System (Desafio Backend)

Este projeto é uma solução para o desafio de desenvolvimento de um sistema de venda de ingressos distribuído, focado em alta concorrência e integridade de dados.

## 📖 Visão Geral

O sistema gerencia sessões de cinema, assentos e reservas, garantindo que **nenhum assento seja vendido duas vezes** mesmo sob alta carga. A arquitetura utiliza processamento assíncrono para reservas e pagamentos, desacoplando a experiência do usuário do processamento pesado.

## 🛠 Tecnologias Escolhidas

* **Node.js & NestJS**: Framework escolhido pela modularidade, injeção de dependência e facilidade em criar arquiteturas escaláveis e testáveis.
* **PostgreSQL**: Banco de dados relacional robusto, essencial para garantir a propriedade ACID nas transações de vendas e integridade referencial das sessões.
* **Redis**:
    * *Cache*: Para consultas rápidas de disponibilidade de assentos.
    * *Distributed Lock*: Para controle de concorrência (evitar Race Conditions) durante a reserva.
* **Apache Kafka**: Escolhido (vs RabbitMQ) devido à sua capacidade de lidar com alto throughput de eventos e permitir *replay* de mensagens em caso de falhas críticas, garantindo que nenhuma venda seja perdida.
* **Docker & Docker Compose**: Para orquestração do ambiente completo com um único comando.

## 🚀 Como Executar

### Pré-requisitos
* Docker e Docker Compose instalados.
* Portas 3000, 5432, 6379 e 9092 livres.

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone <SEU-LINK-DO-GITHUB>
    cd cinema-booking-system
    ```

2.  **Configure o ambiente:**
    ```bash
    # Copie o arquivo de exemplo
    cp .env.example .env
    ```

3.  **Inicie a aplicação:**
    ```bash
    # Este comando sobe API, Banco, Redis e Kafka
    docker-compose up -d --build
    ```
    *Aguarde alguns instantes até que todos os serviços estejam saudáveis (healthy).*

4.  **Acesse a Documentação (Swagger):**
    * Abra no navegador: `http://localhost:3000/api`

### Executando Testes (Futuro)
```bash
# Testes Unitários
npm run test

# Testes E2E (Integração)
npm run test:e2e