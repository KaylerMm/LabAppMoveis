const { runTests } = require('./run-tests');
const { AuthTester } = require('./test-auth');
const { StressTester } = require('./stress-test');
const { SecurityTester } = require('./security-test');

/**
 * EXEMPLOS PRÁTICOS DE USO DA SUITE DE TESTES
 * ===========================================
 * 
 * Este arquivo demonstra como usar a suite de testes
 * de forma programática e com diferentes configurações.
 */

// Exemplo 1: Teste básico de conectividade
async function exemploConectividade() {
  console.log('\n🔗 EXEMPLO 1: TESTE DE CONECTIVIDADE');
  console.log('====================================');

  const axios = require('axios');
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('📡 Testando conectividade com o servidor...');
    
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status === 200) {
      console.log('✅ Servidor está respondendo');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📄 Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      console.log(`❌ Servidor retornou status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro de conectividade: ${error.message}`);
    return false;
  }
}

// Exemplo 2: Teste customizado de autenticação
async function exemploAutenticacao() {
  console.log('\n🔐 EXEMPLO 2: TESTE PERSONALIZADO DE AUTENTICAÇÃO');
  console.log('=================================================');

  const authTester = new AuthTester();

  try {
    console.log('🚀 Configurando autenticação...');
    const authResult = await authTester.setupAuthentication();

    if (authResult.success) {
      console.log('✅ Autenticação configurada com sucesso');
      console.log(`🔑 Token obtido: ${authResult.token.substring(0, 20)}...`);

      // Testar múltiplas rotas protegidas
      const rotasProtegidas = ['/api/tasks', '/api/tasks/123'];
      
      for (const rota of rotasProtegidas) {
        console.log(`🔍 Testando acesso a ${rota}...`);
        const resultado = await authTester.testProtectedRoute(rota);
        
        if (resultado.success) {
          console.log(`✅ Acesso autorizado a ${rota}`);
        } else {
          console.log(`❌ Acesso negado a ${rota}: ${resultado.status}`);
        }
      }

      return true;
    } else {
      console.log('❌ Falha na configuração de autenticação');
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

// Exemplo 3: Teste customizado de rate limiting
async function exemploRateLimit() {
  console.log('\n🚦 EXEMPLO 3: TESTE PERSONALIZADO DE RATE LIMITING');
  console.log('==================================================');

  const axios = require('axios');
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('📈 Enviando múltiplas requisições para testar rate limit...');
    
    const requests = [];
    const totalRequests = 25; // Número menor para exemplo
    
    // Enviar requests em paralelo
    for (let i = 0; i < totalRequests; i++) {
      requests.push(
        axios.get(`${baseUrl}/health`, {
          validateStatus: () => true,
          timeout: 5000
        }).then(response => ({
          requestNumber: i + 1,
          status: response.status,
          blocked: response.status === 429
        })).catch(error => ({
          requestNumber: i + 1,
          error: error.message,
          blocked: false
        }))
      );
    }

    const responses = await Promise.all(requests);
    
    // Analisar resultados
    const successful = responses.filter(r => r.status === 200).length;
    const blocked = responses.filter(r => r.blocked).length;
    const errors = responses.filter(r => r.error).length;

    console.log(`📊 Resultados:`);
    console.log(`   ✅ Sucessos: ${successful}`);
    console.log(`   🚫 Bloqueados: ${blocked}`);
    console.log(`   ❌ Erros: ${errors}`);

    if (blocked > 0) {
      console.log('✅ Rate limiting está funcionando!');
      console.log(`🔒 ${blocked} requests foram bloqueados`);
    } else {
      console.log('⚠️  Rate limiting pode não estar configurado');
    }

    return blocked > 0;

  } catch (error) {
    console.log(`❌ Erro no teste de rate limit: ${error.message}`);
    return false;
  }
}

// Exemplo 4: Teste de performance simples
async function exemploPerformance() {
  console.log('\n⚡ EXEMPLO 4: TESTE SIMPLES DE PERFORMANCE');
  console.log('==========================================');

  const axios = require('axios');
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('⏱️  Medindo tempo de resposta...');
    
    const endpoints = ['/', '/health'];
    const results = {};

    for (const endpoint of endpoints) {
      const times = [];
      const attempts = 5;

      console.log(`📊 Testando ${endpoint} (${attempts} tentativas)...`);

      for (let i = 0; i < attempts; i++) {
        const startTime = Date.now();
        
        try {
          await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
          const responseTime = Date.now() - startTime;
          times.push(responseTime);
        } catch (error) {
          times.push(Date.now() - startTime);
        }

        // Pequeno delay entre requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      results[endpoint] = {
        avg: Math.round(avgTime),
        min: minTime,
        max: maxTime
      };

      console.log(`   📈 Média: ${results[endpoint].avg}ms`);
      console.log(`   ⏫ Máximo: ${results[endpoint].max}ms`);
      console.log(`   ⏬ Mínimo: ${results[endpoint].min}ms`);
    }

    return results;

  } catch (error) {
    console.log(`❌ Erro no teste de performance: ${error.message}`);
    return null;
  }
}

// Exemplo 5: Teste de segurança específico
async function exemploSeguranca() {
  console.log('\n🔒 EXEMPLO 5: TESTE ESPECÍFICO DE SEGURANÇA');
  console.log('===========================================');

  const axios = require('axios');
  const baseUrl = 'http://localhost:3000';

  try {
    console.log('🔍 Testando acesso não autorizado...');
    
    // Tentar acessar rota protegida sem token
    const response = await axios.get(`${baseUrl}/api/tasks`, {
      validateStatus: () => true
    });

    if (response.status === 401 || response.status === 403) {
      console.log('✅ Rota protegida está funcionando corretamente');
      console.log(`🔒 Status retornado: ${response.status}`);
    } else if (response.status === 200) {
      console.log('❌ VULNERABILIDADE: Rota deveria estar protegida!');
      console.log('🚨 Acesso não autorizado foi permitido');
    } else {
      console.log(`⚠️  Status inesperado: ${response.status}`);
    }

    // Testar com token inválido
    console.log('🔍 Testando token inválido...');
    const invalidResponse = await axios.get(`${baseUrl}/api/tasks`, {
      headers: { 'Authorization': 'Bearer invalid.token.here' },
      validateStatus: () => true
    });

    if (invalidResponse.status === 401 || invalidResponse.status === 403) {
      console.log('✅ Token inválido foi rejeitado corretamente');
    } else {
      console.log('❌ VULNERABILIDADE: Token inválido foi aceito!');
    }

    return {
      protectedRouteSecure: response.status === 401 || response.status === 403,
      invalidTokenRejected: invalidResponse.status === 401 || invalidResponse.status === 403
    };

  } catch (error) {
    console.log(`❌ Erro no teste de segurança: ${error.message}`);
    return null;
  }
}

// Exemplo 6: Execução de testes customizados
async function exemploTestesCustomizados() {
  console.log('\n🎯 EXEMPLO 6: EXECUÇÃO DE TESTES CUSTOMIZADOS');
  console.log('==============================================');

  try {
    // Executar apenas teste de estresse
    console.log('⚡ Executando apenas testes de estresse...');
    const stressResult = await runTests('stress');
    
    if (stressResult.success) {
      console.log('✅ Testes de estresse concluídos');
      console.log(`🎯 Score: ${stressResult.stress?.score || 'N/A'}/100`);
    }

    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Executar teste rápido
    console.log('\n⚡ Executando teste rápido...');
    const quickResult = await runTests('quick');
    
    if (quickResult.success) {
      console.log('✅ Teste rápido concluído');
      console.log(`🎯 Score: ${quickResult.score || 'N/A'}/100`);
    }

    return {
      stress: stressResult,
      quick: quickResult
    };

  } catch (error) {
    console.log(`❌ Erro nos testes customizados: ${error.message}`);
    return null;
  }
}

// Função principal para executar todos os exemplos
async function executarExemplos() {
  console.log('\n🚀 EXECUTANDO EXEMPLOS PRÁTICOS DE USO');
  console.log('======================================');
  console.log('⚠️  Certifique-se de que o servidor esteja rodando em http://localhost:3000');

  const resultados = {};

  try {
    // Exemplo 1: Conectividade
    resultados.conectividade = await exemploConectividade();
    
    if (!resultados.conectividade) {
      console.log('\n❌ Servidor não está respondendo. Parando exemplos.');
      return resultados;
    }

    // Exemplo 2: Autenticação
    resultados.autenticacao = await exemploAutenticacao();

    // Exemplo 3: Rate Limiting
    resultados.rateLimit = await exemploRateLimit();

    // Exemplo 4: Performance
    resultados.performance = await exemploPerformance();

    // Exemplo 5: Segurança
    resultados.seguranca = await exemploSeguranca();

    // Exemplo 6: Testes Customizados (opcional)
    // resultados.customizados = await exemploTestesCustomizados();

    console.log('\n📋 RESUMO DOS EXEMPLOS:');
    console.log('=======================');
    console.log(`🔗 Conectividade: ${resultados.conectividade ? '✅' : '❌'}`);
    console.log(`🔐 Autenticação: ${resultados.autenticacao ? '✅' : '❌'}`);
    console.log(`🚦 Rate Limiting: ${resultados.rateLimit ? '✅' : '❌'}`);
    console.log(`⚡ Performance: ${resultados.performance ? '✅' : '❌'}`);
    console.log(`🔒 Segurança: ${resultados.seguranca ? '✅' : '❌'}`);

    return resultados;

  } catch (error) {
    console.error(`💥 Erro fatal nos exemplos: ${error.message}`);
    return resultados;
  }
}

// Dicas de uso
function mostrarDicas() {
  console.log(`
💡 DICAS DE USO:
===============

1. 🔧 CONFIGURAÇÃO:
   - Configure a URL base: export TEST_BASE_URL=http://localhost:3000
   - Ajuste timeout: export TEST_TIMEOUT=10000

2. 🚀 EXECUÇÃO:
   - Teste rápido: npm run test:quick
   - Teste completo: npm test
   - Apenas segurança: npm run test:security

3. 📊 INTERPRETAÇÃO DE RESULTADOS:
   - Score 90-100: Excelente segurança
   - Score 75-89: Boa segurança
   - Score 60-74: Segurança regular
   - Score <60: Necessita melhorias

4. ⚠️ PROBLEMAS COMUNS:
   - "Connection refused": Servidor não está rodando
   - "Timeout": Servidor muito lento ou sobrecarregado
   - "401/403": Autenticação funcionando (esperado)

5. 🔒 SEGURANÇA:
   - Execute apenas em desenvolvimento
   - NUNCA em produção
   - Monitore logs durante os testes
`);
}

// Executar se chamado diretamente
if (require.main === module) {
  const comando = process.argv[2];

  if (comando === 'dicas') {
    mostrarDicas();
  } else {
    executarExemplos()
      .then(resultados => {
        console.log('\n🏁 EXEMPLOS CONCLUÍDOS!');
        console.log('\n💡 Para ver dicas de uso: node example-usage.js dicas');
      })
      .catch(error => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  exemploConectividade,
  exemploAutenticacao,
  exemploRateLimit,
  exemploPerformance,
  exemploSeguranca,
  exemploTestesCustomizados,
  executarExemplos,
  mostrarDicas
};
