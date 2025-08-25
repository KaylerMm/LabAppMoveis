# 📋 DOCUMENTAÇÃO COMPLETA - SUITE DE TESTES

## 🚀 Visão Geral

Esta é uma suite completa de testes de estresse e segurança para APIs Node.js, especificamente desenvolvida para testar o sistema de gerenciamento de tarefas. A suite implementa testes abrangentes que avaliam performance, segurança e confiabilidade do servidor.

## 📁 Estrutura do Projeto

```
tests/
├── index.js                # Interface principal unificada
├── package.json           # Dependências e scripts npm
├── test-config.js         # Configurações personalizáveis
├── test-auth.js           # Testes específicos de autenticação
├── stress-test.js         # Testes de estresse e performance
├── security-test.js       # Testes avançados de segurança
├── run-tests.js           # Script principal para execução
├── example-usage.js       # Exemplos práticos de uso
├── install-tests.sh       # Script de instalação automatizada
├── README-TESTES.md       # Esta documentação
└── RESUMO-IMPLEMENTACAO.md # Resumo técnico da implementação
```

## 🔧 Instalação

### Método 1: Instalação Automática (Recomendado)

```bash
cd tests/
bash install-tests.sh
```

### Método 2: Instalação Manual

```bash
cd tests/
npm install
```

### Dependências

- **axios**: Para requisições HTTP
- **colors**: Para output colorido no terminal

## 🎯 Funcionalidades Principais

### 1. 🔐 Testes de Autenticação

**Arquivo:** `test-auth.js`

- ✅ Registro automático de usuário de teste
- ✅ Login e obtenção de token JWT válido
- ✅ Teste de acesso a rotas protegidas
- ✅ Validação de rejeição de credenciais inválidas
- ✅ Cenários múltiplos de autenticação

**Exemplo de uso:**
```bash
npm run test:auth
```

### 2. ⚡ Testes de Estresse e Performance

**Arquivo:** `stress-test.js`

#### Rate Limiting
- Teste com 120 requests para endpoints públicos
- Teste com 550 requests para endpoints autenticados
- Validação se rate limiting está funcionando
- Contagem de requests bloqueados vs aceitos

#### Performance
- 50 requests concorrentes simultâneos
- Teste de throughput com 100 iterações
- Medição de tempo de resposta médio, mínimo e máximo
- Análise de taxa de sucesso

#### Detecção de Pacotes Perdidos
- 100 requests com timeout configurável
- Detecção de timeouts de rede
- Cálculo de taxa de perda de pacotes
- Diferenciação entre erros de rede e servidor

**Exemplo de uso:**
```bash
npm run test:stress
```

### 3. 🔒 Testes de Segurança

**Arquivo:** `security-test.js`

#### SQL Injection
- 10 payloads maliciosos testados
- Endpoints: login, registro, criação de tarefas
- Detecção de erros SQL expostos
- Análise de comportamento anômalo

#### Cross-Site Scripting (XSS)
- 10 payloads XSS testados
- Teste em campos de entrada
- Verificação de sanitização
- Testes em rotas autenticadas

#### Path Traversal
- 10 payloads de directory traversal
- Teste em parâmetros de URL
- Detecção de acesso não autorizado a arquivos

#### Força Bruta
- 11 senhas comuns testadas
- Detecção de proteção por rate limiting
- Análise de respostas de login
- Contagem de tentativas bloqueadas

#### JWT Bypass
- 10 tentativas de bypass diferentes
- Tokens malformados e nulos
- Verificação de validação adequada
- Teste de algoritmos inseguros

#### Injeção de Headers
- 10 headers maliciosos testados
- Detecção de vulnerabilidades de parsing
- Análise de comportamento do servidor

#### Rotas Autenticadas
- Teste com autenticação real
- Payloads maliciosos em endpoints protegidos
- Verificação de sanitização pós-autenticação

**Exemplo de uso:**
```bash
npm run test:security
```

## 📋 Comandos Disponíveis

### Scripts NPM

```bash
npm test                    # Executa todos os testes (completo)
npm run test:quick          # Teste rápido (3-5 minutos)
npm run test:stress         # Apenas testes de estresse
npm run test:security       # Apenas testes de segurança  
npm run test:auth           # Apenas testes de autenticação
npm run test:examples       # Executa exemplos práticos
npm run help                # Mostra ajuda detalhada
```

### Execução Direta

```bash
node index.js full          # Todos os testes
node index.js quick         # Teste rápido
node index.js stress        # Testes de estresse
node index.js security      # Testes de segurança
node index.js auth          # Testes de autenticação
node index.js help          # Ajuda
node index.js config        # Mostrar configuração atual
```

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# URL do servidor
export TEST_BASE_URL=http://localhost:3000

# Configurações de timeout
export TEST_TIMEOUT=10000

# Configurações de estresse
export TEST_CONCURRENT_REQUESTS=50
export TEST_ITERATIONS=100
export TEST_RATE_REQUESTS=120

# Configurações de segurança
export TEST_BRUTE_FORCE_ATTEMPTS=20

# Usuário de teste
export TEST_USERNAME=testuser_custom
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=CustomPassword123!
```

### Configuração por Ambiente

O sistema suporta configurações diferentes por ambiente:

- **development**: Modo verboso, menos restritivo
- **test**: Modo silencioso, mais restritivo
- **production**: Configurações de segurança máxima

```bash
NODE_ENV=test npm test
```

## 📊 Sistema de Scoring

### Pontuação (0-100)

#### Autenticação (20 pontos)
- ✅ Registro funcionando: 4 pontos
- ✅ Login funcionando: 4 pontos
- ✅ Acesso protegido funcionando: 4 pontos
- ✅ Rejeição de login inválido: 4 pontos
- ✅ Rejeição de acesso sem token: 4 pontos

#### Estresse (40 pontos)
- ✅ Rate limiting público funcionando: 15 pontos
- ✅ Rate limiting autenticado funcionando: 15 pontos
- ✅ Performance adequada (>90% sucesso): 10 pontos

#### Segurança (40 pontos)
- ❌ SQL Injection detectado: -20 pontos
- ❌ XSS detectado: -15 pontos
- ❌ Path Traversal detectado: -15 pontos
- ❌ Força bruta bem-sucedida: -25 pontos
- ❌ JWT Bypass detectado: -20 pontos
- ❌ Header Injection detectado: -10 pontos
- ❌ Rotas autenticadas vulneráveis: -15 pontos

### Classificações

- 🟢 **90-100**: EXCELENTE - Sistema muito seguro
- 🔵 **75-89**: BOM - Segurança adequada
- 🟡 **60-74**: REGULAR - Necessita melhorias
- 🟠 **40-59**: RUIM - Vulnerabilidades importantes
- 🔴 **0-39**: CRÍTICO - Múltiplas vulnerabilidades

## 📈 Interpretação de Resultados

### Rate Limiting

**✅ Funcionando Corretamente:**
```
📊 Requests bloqueados: 25/125
Taxa de bloqueio: 20.00%
```

**❌ Não Funcionando:**
```
📊 Requests bloqueados: 0/125
Taxa de bloqueio: 0.00%
```

### Performance

**✅ Performance Adequada:**
```
Taxa de sucesso: 98.5%
Tempo médio de resposta: 245ms
Throughput: 67.2 req/s
```

**❌ Performance Inadequada:**
```
Taxa de sucesso: 76.2%
Tempo médio de resposta: 2847ms
Throughput: 12.1 req/s
```

### Segurança

**✅ Seguro:**
```
💉 SQL INJECTION: ✅ SEGURO
🔴 XSS: ✅ SEGURO
🔐 JWT BYPASS: ✅ SEGURO
```

**❌ Vulnerável:**
```
💉 SQL INJECTION: ❌ VULNERÁVEL
   Testados: 40 | Vulneráveis: 3
🔴 XSS: ❌ VULNERÁVEL
   Testados: 32 | Vulneráveis: 1
```

### Packet Loss

**✅ Rede Estável:**
```
Taxa de perda: 1.2%
Timeouts: 1
Erros de rede: 0
```

**❌ Problemas de Rede:**
```
Taxa de perda: 8.5%
Timeouts: 7
Erros de rede: 2
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. "Connection refused" / "ECONNREFUSED"

**Causa:** Servidor não está rodando

**Solução:**
```bash
cd ..
npm start  # ou node server.js
```

#### 2. "Timeout" / "ECONNABORTED"

**Causa:** Servidor muito lento ou sobrecarregado

**Soluções:**
```bash
# Aumentar timeout
export TEST_TIMEOUT=15000

# Reduzir requests concorrentes
export TEST_CONCURRENT_REQUESTS=25
```

#### 3. "Falha ao registrar usuário de teste"

**Causa:** Problema na API de registro

**Verificações:**
- Endpoint `/api/auth/register` existe?
- Aceita campos: username, email, password, name?
- Retorna status 201/200 para sucesso?

#### 4. "Token não disponível"

**Causa:** Problema na API de login

**Verificações:**
- Endpoint `/api/auth/login` existe?
- Aceita campos: email, password?
- Retorna token JWT no formato: `{ token: "..." }`?

#### 5. Score muito baixo sem vulnerabilidades aparentes

**Causas possíveis:**
- Rate limiting não configurado
- Performance inadequada
- Autenticação não funcionando

**Investigação:**
```bash
# Teste apenas autenticação
npm run test:auth

# Teste apenas performance
npm run test:stress
```

### Logs Detalhados

Para debug, ative modo verboso:

```bash
NODE_ENV=development npm test
```

### Problemas de Permissão

```bash
chmod +x install-tests.sh
```

## 🔧 Customização

### Adicionando Novos Payloads

**test-config.js:**
```javascript
maliciousPayloads: {
  sqlInjection: [
    // Adicionar novos payloads aqui
    "'; DROP DATABASE production; --"
  ]
}
```

### Criando Novos Testes

```javascript
// Exemplo: Novo teste de API
async function testCustomEndpoint() {
  const response = await this.axios.get('/api/custom');
  // Lógica de validação
  return { success: true, details: {} };
}
```

### Configurações Personalizadas

```javascript
// test-config.js personalizado
module.exports = {
  server: {
    baseUrl: 'https://api.minhaempresa.com',
    timeout: 20000
  },
  // ... outras configurações
};
```

## 📝 Exemplos Práticos

### Teste Básico de Conectividade

```bash
node example-usage.js
```

### Teste Customizado

```javascript
const { StressTester } = require('./stress-test');

async function meuTeste() {
  const tester = new StressTester('http://localhost:3000');
  const result = await tester.testRateLimit();
  console.log(result);
}
```

### Integração em CI/CD

```yaml
# .github/workflows/tests.yml
- name: Executar Testes de Segurança
  run: |
    cd tests
    npm install
    npm run test:security
```

## 🛡️ Segurança e Ética

### ⚠️ IMPORTANTE

- **NUNCA execute em produção**
- **Apenas em ambiente de desenvolvimento/teste**
- **Obtenha autorização antes de testar sistemas**
- **Use apenas em sistemas próprios**

### Considerações Éticas

- Os testes são para **avaliação de segurança**, não para exploração
- Dados de teste são temporários e devem ser removidos
- Não tente explorar vulnerabilidades encontradas
- Reporte problemas de segurança responsavelmente

### Conformidade

Esta suite foi desenvolvida para:
- ✅ Avaliar segurança de sistemas próprios
- ✅ Educação em segurança de aplicações
- ✅ Conformidade com OWASP Top 10
- ✅ Testes de penetração autorizados

## 📚 Referências Técnicas

### OWASP Top 10

A suite testa vulnerabilidades do OWASP Top 10:

1. **A03:2021 – Injection** (SQL Injection, XSS)
2. **A01:2021 – Broken Access Control** (Path Traversal, JWT Bypass)
3. **A07:2021 – Identification and Authentication Failures** (Força Bruta)

### Metodologia de Teste

Baseada em:
- OWASP Testing Guide
- NIST Cybersecurity Framework
- ISO 27001 Security Testing

### Padrões Implementados

- Rate Limiting (RFC 6585)
- JWT Security (RFC 7519)
- HTTP Security Headers (OWASP)
- RESTful API Security

## 🤝 Contribuição

### Reportando Bugs

```bash
# Template de bug report
Descrição: [Descrição do problema]
Ambiente: [OS, Node version, etc.]
Reprodução: [Passos para reproduzir]
Resultado esperado: [O que deveria acontecer]
Resultado atual: [O que está acontecendo]
```

### Melhorias

Sugestões de melhorias são bem-vindas:
- Novos tipos de teste
- Melhores payloads
- Otimizações de performance
- Documentação adicional

## 📞 Suporte

### FAQ

**P: Posso usar em APIs que não sejam Node.js?**
R: Sim, desde que sigam padrões HTTP/REST similares.

**P: Como adicionar novos endpoints para teste?**
R: Edite `config.endpoints` em `test-config.js`.

**P: Os testes afetam dados reais?**
R: Podem criar dados de teste temporários. Use apenas em desenvolvimento.

### Contato

Para dúvidas técnicas ou suporte:
- Revise a documentação completa
- Verifique exemplos em `example-usage.js`
- Execute `npm run help` para ajuda interativa

---

**📝 Última atualização:** Agosto 2025  
**🔢 Versão:** 1.0.0  
**👨‍💻 Desenvolvido para:** Lab App Móveis - PUC
