# Documentação da API de Tarefas

## Autenticação
Todas as rotas requerem autenticação via JWT (middleware `authMiddleware`).

## Endpoints

### Listar tarefas
- **GET /tasks**
- Parâmetros de query: `completed`, `priority`, `page`, `limit`, `startDate`, `endDate`, `category`, `tags`
- Resposta:
```json
{
  "success": true,
  "data": [ ... ],
  "page": 1,
  "limit": 10
}
```

### Criar tarefa
- **POST /tasks**
- Payload:
```json
{
  "title": "string",
  "description": "string",
  "priority": "string",
  "category": "string",
  "tags": "tag1,tag2"
}
```
- Resposta:
```json
{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": { ... }
}
```

### Buscar tarefa por ID
- **GET /tasks/:id**
- Resposta:
```json
{
  "success": true,
  "data": { ... }
}
```

### Atualizar tarefa
- **PUT /tasks/:id**
- Payload:
```json
{
  "title": "string",
  "description": "string",
  "completed": true,
  "priority": "string"
}
```
- Resposta:
```json
{
  "success": true,
  "message": "Tarefa atualizada com sucesso",
  "data": { ... }
}
```

### Deletar tarefa
- **DELETE /tasks/:id**
- Resposta:
```json
{
  "success": true,
  "message": "Tarefa deletada com sucesso"
}
```

### Estatísticas
- **GET /tasks/stats/summary**
- Resposta:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "completed": 5,
    "pending": 5,
    "completionRate": 50.00
  }
}
```

## Observações
- Todos os endpoints exigem autenticação JWT.
- Os campos `category` e `tags` são opcionais.
