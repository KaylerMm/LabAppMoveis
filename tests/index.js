#!/usr/bin/env node

const { runTests } = require('./run-tests');
const config = require('./test-config');

class TestInterface {
  constructor() {
    this.commands = {
      'help': this.showHelp.bind(this),
      'quick': () => runTests('quick'),
      'stress': () => runTests('stress'),
      'security': () => runTests('security'),
      'auth': () => runTests('auth'),
      'full': () => runTests('full'),
      'config': this.showConfig.bind(this)
    };
  }

  // Mostrar ajuda
  showHelp() {
    console.log(`
🚀 TASK API TEST SUITE
======================

Uma suite completa de testes de estresse e segurança para APIs Node.js.

📋 COMANDOS DISPONÍVEIS:

🔹 npm test                    - Executa todos os testes (completo)
🔹 npm run test:quick          - Teste rápido (autenticação + conectividade)
🔹 npm run test:stress         - Apenas testes de estresse e performance
🔹 npm run test:security       - Apenas testes de segurança
🔹 npm run test:auth           - Apenas testes de autenticação
🔹 npm run help                - Esta ajuda

📋 EXECUÇÃO DIRETA:

🔹 node index.js quick         - Teste rápido
🔹 node index.js stress        - Testes de estresse
🔹 node index.js security      - Testes de segurança
🔹 node index.js full          - Todos os testes
🔹 node index.js help          - Esta ajuda
🔹 node index.js config        - Mostrar configurações

🔧 CONFIGURAÇÃO:

Configure o ambiente através de variáveis:
- TEST_BASE_URL=http://localhost:3000
- TEST_TIMEOUT=10000
- TEST_CONCURRENT_REQUESTS=50

📊 O QUE CADA TESTE FAZ:

🔐 AUTENTICAÇÃO:
   ✅ Registra usuário de teste
   ✅ Faz login e obtém token JWT
   ✅ Testa acesso a rotas protegidas
   ✅ Valida rejeição de credenciais inválidas

⚡ ESTRESSE:
   ✅ Rate limiting (público e autenticado)
   ✅ Requests concorrentes (${config.stress.concurrentRequests} simultâneos)
   ✅ Teste de throughput (${config.stress.iterations} iterações)
   ✅ Detecção de pacotes perdidos
   ✅ Medição de tempo de resposta

🔒 SEGURANÇA:
   ✅ SQL Injection (${config.security.maliciousPayloads.sqlInjection.length} payloads)
   ✅ XSS - Cross-Site Scripting (${config.security.maliciousPayloads.xss.length} payloads)
   ✅ Path Traversal (${config.security.maliciousPayloads.pathTraversal.length} payloads)
   ✅ Força bruta em login
   ✅ Bypass de JWT
   ✅ Injeção de headers maliciosos
   ✅ Testes em rotas autenticadas

🎯 SCORING:

Os testes geram um score de 0-100 baseado em:
- Autenticação funcionando corretamente
- Rate limiting ativo e efetivo
- Ausência de vulnerabilidades críticas
- Performance adequada
- Baixa taxa de perda de pacotes

📝 EXEMPLO DE USO:

# Teste rápido para verificar se está funcionando
npm run test:quick

# Teste completo (recomendado)
npm test

# Apenas segurança (para auditoria)
npm run test:security

⚠️  IMPORTANTE:

- Execute apenas em ambiente de desenvolvimento/teste
- NUNCA execute em produção
- O servidor deve estar rodando antes dos testes
- Alguns testes criam dados temporários

🌐 URL padrão: ${config.server.baseUrl}
`);
    return Promise.resolve({ success: true });
  }

  // Mostrar configuração atual
  showConfig() {
    console.log(`
🔧 CONFIGURAÇÃO ATUAL:
=====================

🌐 Servidor:
   URL Base: ${config.server.baseUrl}
   Timeout: ${config.server.timeout}ms
   Tentativas: ${config.server.retryAttempts}

⚡ Testes de Estresse:
   Requests Concorrentes: ${config.stress.concurrentRequests}
   Iterações: ${config.stress.iterations}
   Requests Rate Test: ${config.stress.rateTestRequests}
   Duração: ${config.stress.testDuration}ms

🚦 Rate Limiting:
   Público: ${config.rateLimit.public.maxRequests} req/${config.rateLimit.public.windowMs}ms
   Autenticado: ${config.rateLimit.authenticated.maxRequests} req/${config.rateLimit.authenticated.windowMs}ms

🔒 Segurança:
   Força Bruta: ${config.security.bruteForceAttempts} tentativas
   SQL Injection: ${config.security.maliciousPayloads.sqlInjection.length} payloads
   XSS: ${config.security.maliciousPayloads.xss.length} payloads
   Path Traversal: ${config.security.maliciousPayloads.pathTraversal.length} payloads

👤 Usuário de Teste:
   Username: ${config.testUser.username}
   Email: ${config.testUser.email}
   Password: ${config.testUser.password.replace(/./g, '*')}

🔧 Para alterar configurações, use variáveis de ambiente:
   export TEST_BASE_URL=http://localhost:3000
   export TEST_TIMEOUT=10000
   export TEST_CONCURRENT_REQUESTS=50
`);
    return Promise.resolve({ success: true });
  }

  // Executar comando
  async run(command = 'help') {
    console.log('🚀 TASK API TEST SUITE v1.0.0');
    console.log('==============================\n');

    // Validar configuração
    try {
      config.validateConfig();
    } catch (error) {
      console.error(`❌ Erro de configuração: ${error.message}`);
      process.exit(1);
    }

    if (this.commands[command]) {
      try {
        const result = await this.commands[command]();
        return result;
      } catch (error) {
        console.error(`❌ Erro ao executar comando '${command}': ${error.message}`);
        return { success: false, error: error.message };
      }
    } else {
      console.log(`❌ Comando '${command}' não encontrado.`);
      console.log('📖 Use "help" para ver comandos disponíveis.');
      return { success: false, error: `Comando não encontrado: ${command}` };
    }
  }

  // Banner de inicialização
  static showBanner() {
    console.log(`
██████████████████████████████████████████████████████████
█  ████████╗ █████╗ ███████╗██╗  ██╗     █████╗ ██████╗ ██
█  ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝    ██╔══██╗██╔══██╗██
█     ██║   ███████║███████╗█████╔╝     ███████║██████╔╝██
█     ██║   ██╔══██║╚════██║██╔═██╗     ██╔══██║██╔═══╝ ██
█     ██║   ██║  ██║███████║██║  ██╗    ██║  ██║██║     ██
█     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝     ██
██████████████████████████████████████████████████████████
█              TEST SUITE - ESTRESSE & SEGURANÇA         █
██████████████████████████████████████████████████████████
`);
  }
}

// Função principal
async function main() {
  const interface = new TestInterface();
  const command = process.argv[2] || 'help';

  // Mostrar banner apenas para comandos principais
  if (['full', 'stress', 'security', 'quick'].includes(command)) {
    TestInterface.showBanner();
  }

  const result = await interface.run(command);
  
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { TestInterface };
