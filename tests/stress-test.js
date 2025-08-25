const axios = require('axios');
const config = require('./test-config');
const { AuthTester, getAuthenticatedAxios } = require('./test-auth');

class StressTester {
  constructor(baseUrl = config.server.baseUrl) {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: config.server.timeout,
      validateStatus: () => true
    });
    this.authTester = new AuthTester(baseUrl);
    this.results = {
      rateLimit: {},
      performance: {},
      reliability: {},
      packetLoss: {}
    };
  }

  // Utilitário para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Teste de Rate Limiting
  async testRateLimit() {
    console.log('\n🚦 TESTE DE RATE LIMITING');
    console.log('=========================');

    const results = {
      public: { tested: false, working: false, blockedRequests: 0, details: {} },
      authenticated: { tested: false, working: false, blockedRequests: 0, details: {} }
    };

    try {
      // Teste para endpoints públicos
      console.log('📊 Testando rate limit para endpoints públicos...');
      const publicResult = await this.testPublicRateLimit();
      results.public = publicResult;

      // Aguardar reset do rate limit
      console.log('⏳ Aguardando reset do rate limit...');
      await this.delay(2000);

      // Teste para endpoints autenticados
      console.log('📊 Testando rate limit para endpoints autenticados...');
      await this.authTester.setupAuthentication();
      const authResult = await this.testAuthenticatedRateLimit();
      results.authenticated = authResult;

    } catch (error) {
      console.log(`❌ Erro no teste de rate limit: ${error.message}`);
    }

    this.results.rateLimit = results;
    return results;
  }

  // Teste de rate limit público
  async testPublicRateLimit() {
    const maxRequests = config.rateLimit.public.maxRequests + 20; // Exceder o limite
    const endpoint = '/health';
    const requests = [];
    const startTime = Date.now();

    console.log(`📈 Enviando ${maxRequests} requests para ${endpoint}...`);

    // Enviar requests em paralelo
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        this.axios.get(endpoint).then(response => ({
          status: response.status,
          success: response.status === 200,
          blocked: response.status === 429,
          requestNumber: i + 1,
          timestamp: Date.now()
        })).catch(error => ({
          status: null,
          success: false,
          blocked: false,
          error: error.message,
          requestNumber: i + 1,
          timestamp: Date.now()
        }))
      );
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // Análise dos resultados
    const successful = responses.filter(r => r.success).length;
    const blocked = responses.filter(r => r.blocked).length;
    const errors = responses.filter(r => r.error).length;
    
    const isWorking = blocked > 0 && blocked >= (maxRequests - config.rateLimit.public.maxRequests - 10);

    return {
      tested: true,
      working: isWorking,
      blockedRequests: blocked,
      details: {
        totalRequests: maxRequests,
        successful,
        blocked,
        errors,
        duration: endTime - startTime,
        ratePerSecond: maxRequests / ((endTime - startTime) / 1000)
      }
    };
  }

  // Teste de rate limit autenticado
  async testAuthenticatedRateLimit() {
    const maxRequests = Math.min(config.rateLimit.authenticated.maxRequests + 50, 200); // Limite para não sobrecarregar
    const endpoint = '/api/tasks';
    const authHeader = this.authTester.getAuthHeader();
    const requests = [];
    const startTime = Date.now();

    console.log(`📈 Enviando ${maxRequests} requests autenticados para ${endpoint}...`);

    // Enviar requests em paralelo
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        this.axios.get(endpoint, { headers: authHeader }).then(response => ({
          status: response.status,
          success: response.status === 200,
          blocked: response.status === 429,
          requestNumber: i + 1,
          timestamp: Date.now()
        })).catch(error => ({
          status: null,
          success: false,
          blocked: false,
          error: error.message,
          requestNumber: i + 1,
          timestamp: Date.now()
        }))
      );
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // Análise dos resultados
    const successful = responses.filter(r => r.success).length;
    const blocked = responses.filter(r => r.blocked).length;
    const errors = responses.filter(r => r.error).length;
    
    // Para usuários autenticados, esperamos menos bloqueios
    const isWorking = successful > config.rateLimit.public.maxRequests;

    return {
      tested: true,
      working: isWorking,
      blockedRequests: blocked,
      details: {
        totalRequests: maxRequests,
        successful,
        blocked,
        errors,
        duration: endTime - startTime,
        ratePerSecond: maxRequests / ((endTime - startTime) / 1000)
      }
    };
  }

  // Teste de Performance e Concorrência
  async testPerformance() {
    console.log('\n⚡ TESTE DE PERFORMANCE');
    console.log('======================');

    const results = {
      concurrency: {},
      throughput: {},
      responseTime: {}
    };

    try {
      // Teste de concorrência
      console.log('🔄 Testando requests concorrentes...');
      results.concurrency = await this.testConcurrency();

      await this.delay(1000);

      // Teste de throughput
      console.log('📊 Testando throughput...');
      results.throughput = await this.testThroughput();

      await this.delay(1000);

      // Teste de tempo de resposta
      console.log('⏱️  Testando tempo de resposta...');
      results.responseTime = await this.testResponseTime();

    } catch (error) {
      console.log(`❌ Erro no teste de performance: ${error.message}`);
    }

    this.results.performance = results;
    return results;
  }

  // Teste de concorrência
  async testConcurrency() {
    const concurrentRequests = config.stress.concurrentRequests;
    const endpoint = '/health';
    const startTime = Date.now();

    console.log(`🚀 Enviando ${concurrentRequests} requests simultâneos...`);

    const requests = Array(concurrentRequests).fill().map(async (_, index) => {
      const reqStartTime = Date.now();
      try {
        const response = await this.axios.get(endpoint);
        return {
          success: response.status === 200,
          responseTime: Date.now() - reqStartTime,
          status: response.status,
          requestNumber: index + 1
        };
      } catch (error) {
        return {
          success: false,
          responseTime: Date.now() - reqStartTime,
          error: error.message,
          requestNumber: index + 1
        };
      }
    });

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    const successful = responses.filter(r => r.success).length;
    const failed = responses.length - successful;
    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    const maxResponseTime = Math.max(...responses.map(r => r.responseTime));
    const minResponseTime = Math.min(...responses.map(r => r.responseTime));

    return {
      totalRequests: concurrentRequests,
      successful,
      failed,
      totalDuration: endTime - startTime,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime,
      successRate: (successful / concurrentRequests * 100).toFixed(2)
    };
  }

  // Teste de throughput
  async testThroughput() {
    const iterations = config.stress.iterations;
    const endpoint = '/';
    const startTime = Date.now();

    console.log(`📈 Testando throughput com ${iterations} iterações...`);

    let successful = 0;
    let failed = 0;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const reqStartTime = Date.now();
      try {
        const response = await this.axios.get(endpoint);
        if (response.status === 200) {
          successful++;
        } else {
          failed++;
        }
        responseTimes.push(Date.now() - reqStartTime);
      } catch (error) {
        failed++;
        responseTimes.push(Date.now() - reqStartTime);
      }

      // Pequeno delay para não sobrecarregar
      if (i % 10 === 0) {
        await this.delay(10);
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    return {
      totalRequests: iterations,
      successful,
      failed,
      totalDuration,
      throughput: (successful / (totalDuration / 1000)).toFixed(2), // requests/segundo
      avgResponseTime: Math.round(avgResponseTime),
      successRate: (successful / iterations * 100).toFixed(2)
    };
  }

  // Teste de tempo de resposta
  async testResponseTime() {
    const endpoints = ['/', '/health', '/api/auth/login'];
    const results = {};

    for (const endpoint of endpoints) {
      const times = [];
      const attempts = 10;

      for (let i = 0; i < attempts; i++) {
        const startTime = Date.now();
        try {
          if (endpoint === '/api/auth/login') {
            // POST request para login
            await this.axios.post(endpoint, {
              email: 'test@example.com',
              password: 'wrongpassword'
            });
          } else {
            // GET request
            await this.axios.get(endpoint);
          }
          times.push(Date.now() - startTime);
        } catch (error) {
          times.push(Date.now() - startTime);
        }
        await this.delay(100);
      }

      results[endpoint] = {
        avg: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
        min: Math.min(...times),
        max: Math.max(...times),
        median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
      };
    }

    return results;
  }

  // Teste de Detecção de Pacotes Perdidos
  async testPacketLoss() {
    console.log('\n📡 TESTE DE DETECÇÃO DE PACOTES PERDIDOS');
    console.log('========================================');

    const totalRequests = 100;
    const endpoint = '/health';
    const timeoutMs = 5000; // 5 segundos timeout
    const results = {
      totalRequests,
      successful: 0,
      timeouts: 0,
      networkErrors: 0,
      serverErrors: 0,
      packetLossRate: 0
    };

    console.log(`📦 Enviando ${totalRequests} requests com detecção de perda...`);

    const requests = Array(totalRequests).fill().map(async (_, index) => {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: timeoutMs
        });
        
        if (response.status >= 200 && response.status < 300) {
          return { type: 'success', status: response.status };
        } else if (response.status >= 500) {
          return { type: 'serverError', status: response.status };
        } else {
          return { type: 'clientError', status: response.status };
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          return { type: 'timeout', error: error.message };
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return { type: 'networkError', error: error.message };
        } else {
          return { type: 'unknownError', error: error.message };
        }
      }
    });

    const responses = await Promise.all(requests);

    // Analisar resultados
    responses.forEach(response => {
      switch (response.type) {
        case 'success':
          results.successful++;
          break;
        case 'timeout':
          results.timeouts++;
          break;
        case 'networkError':
          results.networkErrors++;
          break;
        case 'serverError':
          results.serverErrors++;
          break;
      }
    });

    // Calcular taxa de perda de pacotes
    const lost = results.timeouts + results.networkErrors;
    results.packetLossRate = (lost / totalRequests * 100).toFixed(2);

    console.log(`📊 Requests bem-sucedidos: ${results.successful}/${totalRequests}`);
    console.log(`⏰ Timeouts: ${results.timeouts}`);
    console.log(`🌐 Erros de rede: ${results.networkErrors}`);
    console.log(`🚫 Erros do servidor: ${results.serverErrors}`);
    console.log(`📉 Taxa de perda de pacotes: ${results.packetLossRate}%`);

    this.results.packetLoss = results;
    return results;
  }

  // Executar todos os testes de estresse
  async runAllStressTests() {
    console.log('\n🚀 EXECUTANDO TESTES DE ESTRESSE');
    console.log('=================================');

    const startTime = Date.now();
    const results = {};

    try {
      // Rate Limiting
      results.rateLimit = await this.testRateLimit();
      
      // Performance
      results.performance = await this.testPerformance();
      
      // Packet Loss
      results.packetLoss = await this.testPacketLoss();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Gerar score
      const score = this.calculateStressScore(results);

      return {
        success: true,
        duration: totalDuration,
        results,
        score,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ Erro nos testes de estresse: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  // Calcular score dos testes de estresse
  calculateStressScore(results) {
    let score = 0;
    const maxScore = 100;

    // Rate Limiting (30 pontos)
    if (results.rateLimit?.public?.working) score += 15;
    if (results.rateLimit?.authenticated?.working) score += 15;

    // Performance (40 pontos)
    const concurrency = results.performance?.concurrency;
    if (concurrency) {
      const successRate = parseFloat(concurrency.successRate);
      if (successRate >= 95) score += 20;
      else if (successRate >= 90) score += 15;
      else if (successRate >= 80) score += 10;
      else if (successRate >= 70) score += 5;

      if (concurrency.avgResponseTime < 500) score += 10;
      else if (concurrency.avgResponseTime < 1000) score += 7;
      else if (concurrency.avgResponseTime < 2000) score += 5;
      else if (concurrency.avgResponseTime < 5000) score += 2;
    }

    // Throughput (10 pontos)
    const throughput = results.performance?.throughput;
    if (throughput) {
      const rate = parseFloat(throughput.throughput);
      if (rate >= 50) score += 10;
      else if (rate >= 30) score += 7;
      else if (rate >= 20) score += 5;
      else if (rate >= 10) score += 3;
    }

    // Packet Loss (20 pontos)
    const packetLoss = results.packetLoss;
    if (packetLoss) {
      const lossRate = parseFloat(packetLoss.packetLossRate);
      if (lossRate <= 1) score += 20;
      else if (lossRate <= 3) score += 15;
      else if (lossRate <= 5) score += 10;
      else if (lossRate <= 10) score += 5;
    }

    return Math.min(score, maxScore);
  }

  // Gerar relatório detalhado
  generateReport() {
    console.log('\n📋 RELATÓRIO DE ESTRESSE DETALHADO');
    console.log('==================================');

    const { rateLimit, performance, packetLoss } = this.results;

    // Rate Limiting
    if (rateLimit) {
      console.log('\n🚦 RATE LIMITING:');
      console.log(`   Público: ${rateLimit.public.working ? '✅ FUNCIONANDO' : '❌ FALHANDO'}`);
      if (rateLimit.public.details) {
        console.log(`   - Requests bloqueados: ${rateLimit.public.blockedRequests}/${rateLimit.public.details.totalRequests}`);
        console.log(`   - Taxa de bloqueio: ${(rateLimit.public.blockedRequests / rateLimit.public.details.totalRequests * 100).toFixed(2)}%`);
      }
      
      console.log(`   Autenticado: ${rateLimit.authenticated.working ? '✅ FUNCIONANDO' : '❌ FALHANDO'}`);
      if (rateLimit.authenticated.details) {
        console.log(`   - Requests bem-sucedidos: ${rateLimit.authenticated.details.successful}/${rateLimit.authenticated.details.totalRequests}`);
      }
    }

    // Performance
    if (performance?.concurrency) {
      console.log('\n⚡ PERFORMANCE:');
      console.log(`   Taxa de sucesso: ${performance.concurrency.successRate}%`);
      console.log(`   Tempo médio de resposta: ${performance.concurrency.avgResponseTime}ms`);
      console.log(`   Throughput: ${performance.throughput?.throughput || 'N/A'} req/s`);
    }

    // Packet Loss
    if (packetLoss) {
      console.log('\n📡 PACKET LOSS:');
      console.log(`   Taxa de perda: ${packetLoss.packetLossRate}%`);
      console.log(`   Timeouts: ${packetLoss.timeouts}`);
      console.log(`   Erros de rede: ${packetLoss.networkErrors}`);
    }

    const score = this.calculateStressScore(this.results);
    console.log(`\n🎯 SCORE FINAL DE ESTRESSE: ${score}/100`);

    return score;
  }
}

module.exports = { StressTester };

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new StressTester();
  
  tester.runAllStressTests()
    .then(result => {
      if (result.success) {
        tester.generateReport();
        console.log('\n🏁 Testes de estresse concluídos com sucesso');
      } else {
        console.log(`❌ Testes falharam: ${result.error}`);
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}
