
# Configuração do Firebase Firestore

Para que o aplicativo funcione corretamente com as funcionalidades de Loja Virtual (Pública), CRM (Privado) e os novos **Pontos Comerciais**, copie e cole as regras abaixo no seu Console do Firebase.

## 1. Estrutura do Banco de Dados (Automática)
Você **NÃO** precisa criar tabelas ou colunas manualmente. O aplicativo criará automaticamente os seguintes campos quando você salvar um "Ponto Comercial":
- `clientType`: Define se é 'commercial' ou 'common'.
- `contactPerson`: Nome do responsável.
- `purchasePotential`: Valor numérico.
- `nextVisit`, `lastVisit`: Datas para o cronograma.
- Etc.

## 2. Regras de Segurança (Firestore Rules)
Vá para o console do Firebase -> Firestore Database -> Rules e substitua tudo pelo seguinte:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para a coleção de lojistas (merchants)
    match /merchants/{userId} {
      
      // 1. DADOS DA LOJA (Configuração, Avaliações)
      // Público pode ler os dados da loja (para carregar o banner, produtos, etc)
      allow read: if true;
      
      // O dono pode escrever tudo na sua própria loja.
      // O Público pode atualizar APENAS a configuração se for algo relacionado a métricas públicas (ex: avaliações), 
      // mas aqui restringimos para que apenas o dono altere a config estrutural.
      allow write: if request.auth != null && request.auth.uid == userId;

      // 2. PRODUTOS
      match /products/{productId} {
        allow read: if true; // Vitrine é pública
        allow write: if request.auth != null && request.auth.uid == userId; // Só dono edita/cria produtos
      }

      // 3. CLIENTES (Consumidores e Pontos Comerciais)
      match /clients/{clientId} {
        // O DONO DA LOJA: Tem permissão total (Ler, Criar, Editar, Apagar)
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // PÚBLICO (CHECKOUT):
        // Permite criar clientes (ao fazer um pedido novo)
        // Permite atualizar clientes (para atualizar endereço/telefone ao comprar novamente)
        allow create, update: if true;
        
        // Permite listar (necessário para o sistema verificar se o email já existe e evitar duplicatas)
        allow list: if true;
      }

      // 4. PEDIDOS (ORDERS)
      match /orders/{orderId} {
        // Qualquer um pode criar um pedido (Checkout Público)
        allow create: if true;
        
        // Público pode ler pedidos (Para a tela de "Pedido Realizado" ou rastreamento simples)
        allow read: if true;
        
        // O Dono pode editar status, apagar, etc.
        allow update, delete: if request.auth != null && request.auth.uid == userId;

        // Público pode atualizar APENAS para:
        // 1. Enviar avaliação (rating e review)
        // 2. Cancelar o pedido (alterar status) se necessário
        allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rating', 'review', 'status']); 
      }

      // 5. CUPONS (COUPONS)
      match /coupons/{couponId} {
        // Público pode ler (para validar se o cupom existe no checkout)
        // Idealmente, em produção, usaria uma Cloud Function para validar sem expor a lista, 
        // mas para MVP client-side, permitimos leitura.
        allow read: if true; 

        // Apenas o dono pode criar/editar/apagar cupons
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 3. Índices (Indexes)
O aplicativo foi otimizado para não exigir índices complexos imediatamente.
No entanto, se você tiver muitos clientes e o filtro de "Pontos Comerciais" ficar lento ou der erro, o navegador mostrará um link no Console (F12). Basta clicar nesse link para criar o índice automaticamente.
