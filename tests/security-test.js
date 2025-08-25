const axios = require('axios');
const config = require('./test-config');
const { AuthTester } = require('./test-auth');

class SecurityTester {
  constructor(baseUrl = config.server.baseUrl) {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: config.server.timeout,
      validateStatus: () => true
    });
    this.authTester = new AuthTester(baseUrl);
    this.results = {
      sqlInjection: {},
      xss: {},
      pathTraversal: {},
      bruteForce: {},
      jwtBypass: {},
      headerInjection: {},
      authenticatedRoutes: {}
    };
  }

  // Teste de SQL Injection
  async testSQLInjection() {
    console.log('\n💉 TESTE DE SQL INJECTION');
    console.log('=========================');

    const results = {
      tested: 0,
      vulnerable: 0,
      details: []
    };

    const payloads = config.security.maliciousPayloads.sqlInjection;
    const endpoints = [
      { url: '/api/auth/login', method: 'POST', field: 'email' },
      { url: '/api/auth/login', method: 'POST', field: 'password' },
      { url: '/api/auth/register', method: 'POST', field: 'username' },
      { url: '/api/auth/register', method: 'POST', field: 'email' }
    ];

    console.log(`🔍 Testando ${payloads.length} payloads em ${endpoints.length} endpoints...`);

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const data = this.createTestData(endpoint.field, payload);
          const response = await this.axios[endpoint.method.toLowerCase()](endpoint.url, data);
          
          results.tested++;
          
          // Analisar resposta para possíveis vulnerabilidades
          const isVulnerable = this.analyzeSQLInjectionResponse(response, payload);
          
          if (isVulnerable) {
            results.vulnerable++;
            results.details.push({
              endpoint: endpoint.url,
              method: endpoint.method,
              field: endpoint.field,
              payload: payload.substring(0, 50) + '...',
              status: response.status,
              response: response.data?.message || 'No message'
            });
          }
        } catch (error) {
          results.tested++;
          // Timeouts ou erros de conexão podem indicar problemas
          if (error.code === 'ECONNABORTED') {
            results.vulnerable++;
            results.details.push({
              endpoint: endpoint.url,
              payload: payload.substring(0, 50) + '...',
              error: 'Connection timeout - possível DoS'
            });
          }
        }
      }
    }

    console.log(`📊 Testados: ${results.tested} | Vulneráveis: ${results.vulnerable}`);
    this.results.sqlInjection = results;
    return results;
  }

  // Teste de XSS
  async testXSS() {
    console.log('\n🔴 TESTE DE XSS (Cross-Site Scripting)');
    console.log('======================================');

    const results = {
      tested: 0,
      vulnerable: 0,
      details: []
    };

    const payloads = config.security.maliciousPayloads.xss;
    
    // Configurar autenticação para testar rotas protegidas
    await this.authTester.setupAuthentication();
    const authHeader = this.authTester.getAuthHeader();

    const endpoints = [
      { url: '/api/auth/register', method: 'POST', field: 'name', auth: false },
      { url: '/api/auth/register', method: 'POST', field: 'username', auth: false },
      { url: '/api/tasks', method: 'POST', field: 'title', auth: true },
      { url: '/api/tasks', method: 'POST', field: 'description', auth: true }
    ];

    console.log(`🔍 Testando ${payloads.length} payloads XSS...`);

    for (const endpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const data = this.createTestData(endpoint.field, payload);
          const headers = endpoint.auth ? authHeader : {};
          
          const response = await this.axios[endpoint.method.toLowerCase()](
            endpoint.url, 
            data, 
            { headers }
          );
          
          results.tested++;
          
          // Analisar resposta para XSS
          const isVulnerable = this.analyzeXSSResponse(response, payload);
          
          if (isVulnerable) {
            results.vulnerable++;
            results.details.push({
              endpoint: endpoint.url,
              method: endpoint.method,
              field: endpoint.field,
              payload: payload.substring(0, 50) + '...',
              status: response.status,
              authenticated: endpoint.auth
            });
          }
        } catch (error) {
          results.tested++;
        }
      }
    }

    console.log(`📊 Testados: ${results.tested} | Vulneráveis: ${results.vulnerable}`);
    this.results.xss = results;
    return results;
  }

  // Teste de Path Traversal
  async testPathTraversal() {
    console.log('\n📂 TESTE DE PATH TRAVERSAL');
    console.log('===========================');

    const results = {
      tested: 0,
      vulnerable: 0,
      details: []
    };

    const payloads = config.security.maliciousPayloads.pathTraversal;
    
    // Testar em parâmetros de URL
    const endpoints = [
      '/api/tasks/',
      '/',
      '/api/auth/'
    ];

    console.log(`🔍 Testando ${payloads.length} payloads de path traversal...`);

    for (const baseEndpoint of endpoints) {
      for (const payload of payloads) {
        try {
          const url = baseEndpoint + encodeURIComponent(payload);
          const response = await this.axios.get(url);
          
          results.tested++;
          
          // Verificar se obteve acesso não autorizado
          const isVulnerable = this.analyzePathTraversalResponse(response, payload);
          
          if (isVulnerable) {
            results.vulnerable++;
            results.details.push({
              endpoint: url,
              payload: payload.substring(0, 50) + '...',
              status: response.status,
              responseSize: JSON.stringify(response.data).length
            });
          }
        } catch (error) {
          results.tested++;
        }
      }
    }

    console.log(`📊 Testados: ${results.tested} | Vulneráveis: ${results.vulnerable}`);
    this.results.pathTraversal = results;
    return results;
  }

  // Teste de Força Bruta
  async testBruteForce() {
    console.log('\n🔨 TESTE DE FORÇA BRUTA');
    console.log('========================');

    const results = {
      attempts: 0,
      successful: 0,
      blocked: 0,
      rateLimited: 0,
      details: []
    };

    const passwords = [
      'admin', 'password', '123456', 'admin123', 'root', 'test',
      'password123', 'admin1', 'qwerty', '12345678', 'abc123'
    ];

    const testEmail = 'admin@example.com';
    console.log(`🔍 Tentando ${passwords.length} senhas para ${testEmail}...`);

    for (const password of passwords) {
      try {
        const response = await this.axios.post('/api/auth/login', {
          email: testEmail,
          password: password
        });

        results.attempts++;

        if (response.status === 200 && response.data.token) {
          results.successful++;
          results.details.push({
            password: password,
            status: 'SUCCESS',
            message: 'Login bem-sucedido - VULNERABILIDADE CRÍTICA!'
          });
        } else if (response.status === 429) {
          results.rateLimited++;
          results.details.push({
            password: password,
            status: 'RATE_LIMITED',
            message: 'Bloqueado por rate limiting'
          });
        } else if (response.status === 401) {
          results.blocked++;
          results.details.push({
            password: password,
            status: 'BLOCKED',
            message: 'Credenciais inválidas'
          });
        }

        // Delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.attempts++;
        results.details.push({
          password: password,
          status: 'ERROR',
          message: error.message
        });
      }
    }

    console.log(`📊 Tentativas: ${results.attempts} | Sucessos: ${results.successful} | Rate Limited: ${results.rateLimited}`);
    this.results.bruteForce = results;
    return results;
  }

  // Teste de Bypass de JWT
  async testJWTBypass() {
    console.log('\n🔐 TESTE DE BYPASS DE JWT');
    console.log('==========================');

    const results = {
      tested: 0,
      bypassed: 0,
      details: []
    };

    const payloads = config.security.maliciousPayloads.jwtBypass;
    const protectedEndpoint = '/api/tasks';

    console.log(`🔍 Testando ${payloads.length} tentativas de bypass JWT...`);

    for (const payload of payloads) {
      try {
        const headers = {};
        
        if (payload !== 'null' && payload !== 'undefined' && payload !== '') {
          headers['Authorization'] = payload;
        }

        const response = await this.axios.get(protectedEndpoint, { headers });
        
        results.tested++;

        // Se retorna 200, pode ser um bypass
        if (response.status === 200) {
          results.bypassed++;
          results.details.push({
            payload: payload,
            status: response.status,
            message: 'Possível bypass detectado!'
          });
        } else if (response.status !== 401 && response.status !== 403) {
          results.details.push({
            payload: payload,
            status: response.status,
            message: 'Comportamento inesperado'
          });
        }

      } catch (error) {
        results.tested++;
      }
    }

    console.log(`📊 Testados: ${results.tested} | Bypasses: ${results.bypassed}`);
    this.results.jwtBypass = results;
    return results;
  }

  // Teste de Injeção de Headers
  async testHeaderInjection() {
    console.log('\n📨 TESTE DE INJEÇÃO DE HEADERS');
    console.log('==============================');

    const results = {
      tested: 0,
      vulnerable: 0,
      details: []
    };

    const maliciousHeaders = config.security.maliciousPayloads.headers;

    console.log(`🔍 Testando ${maliciousHeaders.length} headers maliciosos...`);

    for (const headerObj of maliciousHeaders) {
      try {
        const response = await this.axios.get('/', { headers: headerObj });
        
        results.tested++;

        // Analisar resposta para possíveis problemas
        const isVulnerable = this.analyzeHeaderInjectionResponse(response, headerObj);
        
        if (isVulnerable) {
          results.vulnerable++;
          results.details.push({
            headers: headerObj,
            status: response.status,
            message: 'Possível vulnerabilidade de header'
          });
        }

      } catch (error) {
        results.tested++;
        
        // Alguns erros podem indicar vulnerabilidades
        if (error.code === 'ECONNRESET' || error.message.includes('Parse Error')) {
          results.vulnerable++;
          results.details.push({
            headers: headerObj,
            error: error.message,
            message: 'Erro de parsing - possível vulnerabilidade'
          });
        }
      }
    }

    console.log(`📊 Testados: ${results.tested} | Vulneráveis: ${results.vulnerable}`);
    this.results.headerInjection = results;
    return results;
  }

  // Teste de Rotas Autenticadas com Payloads Maliciosos
  async testAuthenticatedRoutes() {
    console.log('\n🔒 TESTE DE ROTAS AUTENTICADAS');
    console.log('==============================');

    const results = {
      tested: 0,
      vulnerable: 0,
      details: []
    };

    try {
      // Configurar autenticação
      await this.authTester.setupAuthentication();
      const authHeader = this.authTester.getAuthHeader();

      // Teste de criação de tarefas com payloads maliciosos
      const maliciousPayloads = [
        ...config.security.maliciousPayloads.xss.slice(0, 3),
        ...config.security.maliciousPayloads.sqlInjection.slice(0, 3)
      ];

      console.log(`🔍 Testando rotas autenticadas com payloads maliciosos...`);

      for (const payload of maliciousPayloads) {
        try {
          // Testar criação de tarefa
          const taskData = {
            title: payload,
            description: `Test task with payload: ${payload}`,
            completed: false
          };

          const response = await this.axios.post('/api/tasks', taskData, { headers: authHeader });
          
          results.tested++;

          // Analisar se o payload foi aceito sem sanitização
          if (response.status === 201 && response.data.success) {
            results.vulnerable++;
            results.details.push({
              endpoint: '/api/tasks',
              method: 'POST',
              payload: payload.substring(0, 50) + '...',
              status: response.status,
              message: 'Payload aceito sem sanitização'
            });
          }

          // Testar busca para ver se o payload é refletido
          const getResponse = await this.axios.get('/api/tasks', { headers: authHeader });
          if (getResponse.status === 200 && JSON.stringify(getResponse.data).includes(payload)) {
            results.details.push({
              endpoint: '/api/tasks',
              method: 'GET',
              payload: payload.substring(0, 50) + '...',
              message: 'Payload refletido na resposta'
            });
          }

        } catch (error) {
          results.tested++;
        }
      }

    } catch (error) {
      console.log(`❌ Erro ao configurar autenticação: ${error.message}`);
    }

    console.log(`📊 Testados: ${results.tested} | Vulneráveis: ${results.vulnerable}`);
    this.results.authenticatedRoutes = results;
    return results;
  }

  // Funções auxiliares de análise

  createTestData(field, payload) {
    const baseData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword',
      name: 'Test User',
      title: 'Test Task',
      description: 'Test Description'
    };

    return { ...baseData, [field]: payload };
  }

  analyzeSQLInjectionResponse(response, payload) {
    // Verificar erros SQL comuns na resposta
    const responseText = JSON.stringify(response.data).toLowerCase();
    const sqlErrors = [
      'sql syntax', 'mysql', 'sqlite', 'postgres', 'oracle',
      'syntax error', 'unexpected', 'column', 'table',
      'database error', 'query failed'
    ];

    return sqlErrors.some(error => responseText.includes(error)) ||
           response.status === 500 && responseText.includes('error');
  }

  analyzeXSSResponse(response, payload) {
    // Verificar se o payload XSS é refletido na resposta
    const responseText = JSON.stringify(response.data);
    return responseText.includes(payload) && 
           (payload.includes('<script>') || payload.includes('javascript:') || payload.includes('onerror'));
  }

  analyzePathTraversalResponse(response, payload) {
    // Verificar se conseguiu acessar arquivos do sistema
    const responseText = JSON.stringify(response.data).toLowerCase();
    const systemFiles = ['passwd', 'shadow', 'hosts', 'boot.ini', 'system32'];
    
    return response.status === 200 && 
           systemFiles.some(file => responseText.includes(file));
  }

  analyzeHeaderInjectionResponse(response, headers) {
    // Verificar comportamentos anômalos
    return response.status >= 500 || 
           (response.headers && Object.keys(response.headers).some(key => 
             key.toLowerCase().includes('x-injected') || 
             response.headers[key]?.includes('<script>')
           ));
  }

  // Executar todos os testes de segurança
  async runAllSecurityTests() {
    console.log('\n🔒 EXECUTANDO TESTES DE SEGURANÇA');
    console.log('=================================');

    const startTime = Date.now();
    const results = {};

    try {
      // SQL Injection
      results.sqlInjection = await this.testSQLInjection();
      
      // XSS
      results.xss = await this.testXSS();
      
      // Path Traversal
      results.pathTraversal = await this.testPathTraversal();
      
      // Brute Force
      results.bruteForce = await this.testBruteForce();
      
      // JWT Bypass
      results.jwtBypass = await this.testJWTBypass();
      
      // Header Injection
      results.headerInjection = await this.testHeaderInjection();
      
      // Authenticated Routes
      results.authenticatedRoutes = await this.testAuthenticatedRoutes();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Gerar score de segurança
      const score = this.calculateSecurityScore(results);

      return {
        success: true,
        duration: totalDuration,
        results,
        score,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ Erro nos testes de segurança: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  // Calcular score de segurança
  calculateSecurityScore(results) {
    let score = 100; // Começar com score máximo
    
    // Deduzir pontos por vulnerabilidades encontradas
    if (results.sqlInjection?.vulnerable > 0) score -= 20;
    if (results.xss?.vulnerable > 0) score -= 15;
    if (results.pathTraversal?.vulnerable > 0) score -= 15;
    if (results.bruteForce?.successful > 0) score -= 25; // Crítico
    if (results.jwtBypass?.bypassed > 0) score -= 20;
    if (results.headerInjection?.vulnerable > 0) score -= 10;
    if (results.authenticatedRoutes?.vulnerable > 0) score -= 15;

    // Bonus por ter rate limiting funcionando
    if (results.bruteForce?.rateLimited > 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Gerar relatório detalhado
  generateReport() {
    console.log('\n🔒 RELATÓRIO DE SEGURANÇA DETALHADO');
    console.log('==================================');

    const { sqlInjection, xss, pathTraversal, bruteForce, jwtBypass, headerInjection, authenticatedRoutes } = this.results;

    // SQL Injection
    if (sqlInjection) {
      console.log(`\n💉 SQL INJECTION: ${sqlInjection.vulnerable > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${sqlInjection.tested} | Vulneráveis: ${sqlInjection.vulnerable}`);
    }

    // XSS
    if (xss) {
      console.log(`\n🔴 XSS: ${xss.vulnerable > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${xss.tested} | Vulneráveis: ${xss.vulnerable}`);
    }

    // Path Traversal
    if (pathTraversal) {
      console.log(`\n📂 PATH TRAVERSAL: ${pathTraversal.vulnerable > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${pathTraversal.tested} | Vulneráveis: ${pathTraversal.vulnerable}`);
    }

    // Brute Force
    if (bruteForce) {
      console.log(`\n🔨 BRUTE FORCE: ${bruteForce.successful > 0 ? '❌ VULNERÁVEL' : '✅ PROTEGIDO'}`);
      console.log(`   Tentativas: ${bruteForce.attempts} | Sucessos: ${bruteForce.successful}`);
      console.log(`   Rate Limited: ${bruteForce.rateLimited} (${bruteForce.rateLimited > 0 ? '✅ Bom' : '⚠️  Sem proteção'})`);
    }

    // JWT Bypass
    if (jwtBypass) {
      console.log(`\n🔐 JWT BYPASS: ${jwtBypass.bypassed > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${jwtBypass.tested} | Bypasses: ${jwtBypass.bypassed}`);
    }

    // Header Injection
    if (headerInjection) {
      console.log(`\n📨 HEADER INJECTION: ${headerInjection.vulnerable > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${headerInjection.tested} | Vulneráveis: ${headerInjection.vulnerable}`);
    }

    // Authenticated Routes
    if (authenticatedRoutes) {
      console.log(`\n🔒 ROTAS AUTENTICADAS: ${authenticatedRoutes.vulnerable > 0 ? '❌ VULNERÁVEL' : '✅ SEGURO'}`);
      console.log(`   Testados: ${authenticatedRoutes.tested} | Vulneráveis: ${authenticatedRoutes.vulnerable}`);
    }

    const score = this.calculateSecurityScore(this.results);
    console.log(`\n🎯 SCORE FINAL DE SEGURANÇA: ${score}/100`);

    // Recomendações
    this.generateRecommendations();

    return score;
  }

  // Gerar recomendações de segurança
  generateRecommendations() {
    console.log('\n💡 RECOMENDAÇÕES DE SEGURANÇA:');
    console.log('==============================');

    const recommendations = [];

    if (this.results.sqlInjection?.vulnerable > 0) {
      recommendations.push('- Implementar sanitização de entrada e prepared statements');
    }

    if (this.results.xss?.vulnerable > 0) {
      recommendations.push('- Implementar escape de HTML e validação de entrada');
    }

    if (this.results.bruteForce?.successful > 0) {
      recommendations.push('- CRÍTICO: Implementar rate limiting mais restritivo para login');
    }

    if (this.results.jwtBypass?.bypassed > 0) {
      recommendations.push('- Verificar validação de JWT em todas as rotas protegidas');
    }

    if (this.results.bruteForce?.rateLimited === 0) {
      recommendations.push('- Implementar rate limiting para prevenir ataques de força bruta');
    }

    if (recommendations.length === 0) {
      console.log('✅ Nenhuma vulnerabilidade crítica encontrada!');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }
  }
}

module.exports = { SecurityTester };

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new SecurityTester();
  
  tester.runAllSecurityTests()
    .then(result => {
      if (result.success) {
        tester.generateReport();
        console.log('\n🏁 Testes de segurança concluídos');
      } else {
        console.log(`❌ Testes falharam: ${result.error}`);
      }
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}
