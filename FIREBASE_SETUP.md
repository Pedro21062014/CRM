# Configuração do Firebase Firestore

Para que o aplicativo funcione corretamente e seguro, configure as regras do Firestore e os índices conforme abaixo.

## 1. Regras de Segurança (Firestore Rules)
Vá para o console do Firebase -> Firestore Database -> Rules e cole o seguinte:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para a coleção de lojistas (merchants)
    match /merchants/{userId} {
      // O dono da loja pode ler e escrever seus dados
      // O público pode ler os dados da loja (para renderizar a vitrine)
      allow read: if true; 
      allow write: if request.auth != null && request.auth.uid == userId;

      // Subcoleção de Produtos
      match /products/{productId} {
        allow read: if true; // Público vê produtos
        allow write: if request.auth != null && request.auth.uid == userId;
      }

      // Subcoleção de Clientes (Privado)
      match /clients/{clientId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Subcoleção de Pedidos (Orders)
      match /orders/{orderId} {
        // Público pode CRIAR um pedido (comprar)
        allow create: if true;
        // Apenas o dono pode ler ou atualizar pedidos
        allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## 2. Índices (Indexes)
Se você tentar ordenar produtos ou pedidos e o console der erro, ele fornecerá um link para criar o índice automaticamente. Geralmente, consultas simples não precisam de índices manuais para este escopo.
