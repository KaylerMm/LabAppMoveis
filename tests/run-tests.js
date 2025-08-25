const { StressTester } = require('./stress-test');
const { SecurityTester } = require('./security-test');
const { runAuthTest } = require('./test-auth');
const config = require('./test-config');

class TestRunner {
  constructor() {
    this.stressTester = new StressTester();
    this.securityTester = new SecurityTester();
    this.results = {};
  }

  // Executar todos os testes
  async runAllTests(options = {}) {
    console.log('\n🚀 EXECUTANDO SUITE COMPLETA DE TESTES');
    console.log('=====================================');
    console.log(`🌐 Servidor: ${config.server.baseUrl}`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString()}`);

    const startTime = Date.now();
    const results = {
      startTime: new Date().toISOString(),
      tests: {}
    };

    try {
      // 1. Teste de Autenticação
      if (!options.skipAuth) {
        console.log('\n1️⃣ EXECUTANDO TESTES DE AUTENTICAÇÃO...');
        results.tests.authentication = await runAuthTest();
      }

      // 2. Testes de Estresse
      if (!options.skipStress) {
        console.log('\n2️⃣ EXECUTANDO TESTES DE ESTRESSE...');
        results.tests.stress = await this.stressTester.runAllStressTests();
      }

      // 3. Testes de Segurança
      if (!options.skipSecurity) {
        console.log('\n3️⃣ EXECUTANDO TESTES DE SEGURANÇA...');
        results.tests.security = await this.securityTester.runAllSecurityTests();
      }

      const endTime = Date.now();
      results.endTime = new Date().toISOString();
      results.totalDuration = endTime - startTime;
      results.success = true;

      // Gerar relatório final
      const finalScore = this.generateFinalReport(results);
      results.finalScore = finalScore;

      return results;

    } catch (error) {
      console.log(`❌ Erro durante execução dos testes: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  // Executar apenas testes de estresse
  async runStressOnly() {
    console.log('\n⚡ EXECUTANDO APENAS TESTES DE ESTRESSE');
    console.log('======================================');

    try {
      const authResult = await runAuthTest();
      const stressResult = await this.stressTester.runAllStressTests();
      
      if (stressResult.success) {
        this.stressTester.generateReport();
      }

      return {
        success: true,
        authentication: authResult,
        stress: stressResult
      };
    } catch (error) {
      console.log(`❌ Erro nos testes de estresse: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Executar apenas testes de segurança
  async runSecurityOnly() {
    console.log('\n🔒 EXECUTANDO APENAS TESTES DE SEGURANÇA');
    console.log('========================================');

    try {
      const authResult = await runAuthTest();
      const securityResult = await this.securityTester.runAllSecurityTests();
      
      if (securityResult.success) {
        this.securityTester.generateReport();
      }

      return {
        success: true,
        authentication: authResult,
        security: securityResult
      };
    } catch (error) {
      console.log(`❌ Erro nos testes de segurança: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Teste rápido
  async runQuickTest() {
    console.log('\n⚡ EXECUTANDO TESTE RÁPIDO');
    console.log('=========================');

    const startTime = Date.now();
    const results = {
      authentication: null,
      connectivity: null,
      basicSecurity: null
    };

    try {
      // 1. Teste de autenticação
      console.log('🔐 Testando autenticação...');
      results.authentication = await runAuthTest();

      // 2. Teste de conectividade básica
      console.log('🌐 Testando conectividade...');
      results.connectivity = await this.testBasicConnectivity();

      // 3. Teste básico de segurança
      console.log('🔒 Testando segurança básica...');
      results.basicSecurity = await this.testBasicSecurity();

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('\n📋 RESULTADOS DO TESTE RÁPIDO:');
      console.log('==============================');
      console.log(`✅ Autenticação: ${results.authentication.success ? 'OK' : 'FALHA'}`);
      console.log(`✅ Conectividade: ${results.connectivity.success ? 'OK' : 'FALHA'}`);
      console.log(`✅ Segurança Básica: ${results.basicSecurity.success ? 'OK' : 'FALHA'}`);
      console.log(`⏱️  Duração: ${duration}ms`);

      const score = this.calculateQuickScore(results);
      console.log(`🎯 Score: ${score}/100`);

      return {
        success: true,
        results,
        score,
        duration
      };

    } catch (error) {
      console.log(`❌ Erro no teste rápido: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Teste básico de conectividade
  async testBasicConnectivity() {
    const axios = require('axios');
    const endpoints = ['/', '/health', '/api/auth/login'];
    const results = { tested: 0, successful: 0, failed: 0, details: [] };

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${config.server.baseUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });

        results.tested++;
        if (response.status < 500) {
          results.successful++;
        } else {
          results.failed++;
        }

        results.details.push({
          endpoint,
          status: response.status,
          success: response.status < 500
        });

      } catch (error) {
        results.tested++;
        results.failed++;
        results.details.push({
          endpoint,
          error: error.message,
          success: false
        });
      }
    }

    return {
      success: results.successful > 0,
      ...results
    };
  }

  // Teste básico de segurança
  async testBasicSecurity() {
    const axios = require('axios');
    const results = {
      corsEnabled: false,
      rateProtection: false,
      authProtection: false,
      details: []
    };

    try {
      // Testar CORS
      const corsResponse = await axios.get(`${config.server.baseUrl}/`, {
        headers: { 'Origin': 'http://evil.com' },
        validateStatus: () => true
      });
      results.corsEnabled = corsResponse.headers['access-control-allow-origin'] !== undefined;

      // Testar proteção de rotas autenticadas
      const authResponse = await axios.get(`${config.server.baseUrl}/api/tasks`, {
        validateStatus: () => true
      });
      results.authProtection = authResponse.status === 401 || authResponse.status === 403;

      // Teste básico de rate limiting (10 requests rápidos)
      const ratePromises = Array(10).fill().map(() => 
        axios.get(`${config.server.baseUrl}/health`, { validateStatus: () => true })
      );
      const rateResponses = await Promise.all(ratePromises);
      results.rateProtection = rateResponses.some(r => r.status === 429);

      return {
        success: results.authProtection, // Mínimo necessário
        ...results
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calcular score do teste rápido
  calculateQuickScore(results) {
    let score = 0;

    if (results.authentication?.success) score += 40;
    if (results.connectivity?.success) score += 30;
    if (results.basicSecurity?.success) score += 30;

    return Math.min(100, score);
  }

  // Gerar relatório final
  generateFinalReport(results) {
    console.log('\n📊 RELATÓRIO FINAL COMPLETO');
    console.log('===========================');

    const scores = {};
    let totalScore = 0;
    let scoreCount = 0;

    // Score de Autenticação
    if (results.tests.authentication) {
      scores.authentication = results.tests.authentication.score || 0;
      console.log(`🔐 Autenticação: ${scores.authentication}/100`);
      totalScore += scores.authentication;
      scoreCount++;
    }

    // Score de Estresse
    if (results.tests.stress) {
      scores.stress = results.tests.stress.score || 0;
      console.log(`⚡ Estresse: ${scores.stress}/100`);
      totalScore += scores.stress;
      scoreCount++;
    }

    // Score de Segurança
    if (results.tests.security) {
      scores.security = results.tests.security.score || 0;
      console.log(`🔒 Segurança: ${scores.security}/100`);
      totalScore += scores.security;
      scoreCount++;
    }

    const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    console.log('\n🎯 SCORE FINAL GERAL');
    console.log('===================');
    console.log(`📊 Score: ${finalScore}/100`);

    // Classificação
    let classification = '';
    if (finalScore >= 90) classification = '🟢 EXCELENTE';
    else if (finalScore >= 75) classification = '🔵 BOM';
    else if (finalScore >= 60) classification = '🟡 REGULAR';
    else if (finalScore >= 40) classification = '🟠 RUIM';
    else classification = '🔴 CRÍTICO';

    console.log(`🏆 Classificação: ${classification}`);

    // Duração total
    if (results.totalDuration) {
      console.log(`⏱️  Duração total: ${(results.totalDuration / 1000).toFixed(2)}s`);
    }

    // Recomendações gerais
    this.generateGeneralRecommendations(scores, finalScore);

    return finalScore;
  }

  // Gerar recomendações gerais
  generateGeneralRecommendations(scores, finalScore) {
    console.log('\n💡 RECOMENDAÇÕES GERAIS:');
    console.log('========================');

    if (finalScore >= 80) {
      console.log('✅ Sistema está bem configurado!');
      console.log('- Continue monitorando a segurança');
      console.log('- Considere testes adicionais em produção');
    } else {
      console.log('⚠️  Sistema precisa de melhorias:');
      
      if (scores.authentication < 80) {
        console.log('- Fortalecer sistema de autenticação');
      }
      
      if (scores.stress < 70) {
        console.log('- Otimizar performance e rate limiting');
      }
      
      if (scores.security < 70) {
        console.log('- Corrigir vulnerabilidades de segurança');
        console.log('- Implementar sanitização de entrada');
      }
    }

    console.log('\n📚 PRÓXIMOS PASSOS:');
    console.log('1. Revisar logs detalhados');
    console.log('2. Corrigir vulnerabilidades críticas');
    console.log('3. Re-executar testes após correções');
    console.log('4. Implementar monitoramento contínuo');
  }
}

// Função principal para execução via linha de comando
async function runTests(testType = 'full', options = {}) {
  const runner = new TestRunner();

  try {
    let result;

    switch (testType) {
      case 'stress':
        result = await runner.runStressOnly();
        break;
      case 'security':
        result = await runner.runSecurityOnly();
        break;
      case 'quick':
        result = await runner.runQuickTest();
        break;
      case 'auth':
        result = await runAuthTest();
        break;
      case 'full':
      default:
        result = await runner.runAllTests(options);
        break;
    }

    if (result.success) {
      console.log('\n🎉 TESTES CONCLUÍDOS COM SUCESSO!');
      return result;
    } else {
      console.log('\n❌ TESTES FALHARAM!');
      console.log(`Erro: ${result.error}`);
      return result;
    }

  } catch (error) {
    console.error('\n💥 ERRO FATAL NOS TESTES:');
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  TestRunner,
  runTests
};

// Executar se chamado diretamente
if (require.main === module) {
  const testType = process.argv[2] || 'full';
  const options = {};

  // Parse de opções da linha de comando
  if (process.argv.includes('--skip-stress')) options.skipStress = true;
  if (process.argv.includes('--skip-security')) options.skipSecurity = true;
  if (process.argv.includes('--skip-auth')) options.skipAuth = true;

  runTests(testType, options)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}
