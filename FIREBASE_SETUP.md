# Configuração do Firebase Firestore

Para que o aplicativo funcione corretamente com as funcionalidades de Loja Virtual (Pública) e CRM (Privado), copie e cole as regras abaixo no seu Console do Firebase.

## 1. Regras de Segurança (Firestore Rules)
Vá para o console do Firebase -> Firestore Database -> Rules e substitua tudo pelo seguinte:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para a coleção de lojistas (merchants)
    match /merchants/{userId} {
      
      // 1. DADOS DA LOJA (Configuração, Avaliações)
      // Público pode ler os dados da loja
      allow read: if true;
      // O dono pode escrever tudo.
      // O Público pode atualizar APENAS para enviar avaliações (alterar storeConfig)
      allow write: if (request.auth != null && request.auth.uid == userId) || 
                   (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['storeConfig']));

      // 2. PRODUTOS
      match /products/{productId} {
        allow read: if true; // Vitrine é pública
        allow write: if request.auth != null && request.auth.uid == userId; // Só dono edita
      }

      // 3. CLIENTES
      match /clients/{clientId} {
        // O dono tem acesso total
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // PERMISSÕES PARA O CHECKOUT PÚBLICO:
        // Permitir criar e atualizar clientes (para salvar endereço/telefone novo)
        allow create, update: if true;
        // Permitir listar clientes (para verificar se o email já existe - deduplicação)
        allow list: if true;
      }

      // 4. PEDIDOS (ORDERS)
      match /orders/{orderId} {
        // Qualquer um pode criar um pedido (Checkout)
        allow create: if true;
        
        // Público pode ler pedidos (Para a função "Meus Pedidos" / Rastreamento)
        allow read: if true;
        
        // Dono pode editar/apagar tudo
        allow update, delete: if request.auth != null && request.auth.uid == userId;

        // Público pode atualizar APENAS para enviar avaliação (rating e review)
        allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['rating', 'review', 'status']); 
        // Nota: incluímos 'status' caso queira permitir cancelamento pelo usuário no futuro, 
        // mas idealmente restrinja. Para avaliação, 'rating' é o essencial.
      }
    }
  }
}
```

## 2. Índices (Indexes)
Caso o console mostre um erro de "indexes" ao tentar carregar a lista de pedidos ou clientes, clique no link fornecido na mensagem de erro (no console do navegador - F12) para criar o índice automaticamente.
