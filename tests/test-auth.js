const axios = require('axios');
const config = require('./test-config');

class AuthTester {
  constructor(baseUrl = config.server.baseUrl) {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: config.server.timeout,
      validateStatus: () => true // Não lançar erro para status HTTP
    });
    this.testUser = { ...config.testUser };
    this.token = null;
  }

  // Registrar usuário de teste
    async registerTestUser() {
        console.log('🔐 Registrando usuário de teste...');
        
        try {
            const userData = {
                username: this.testUser.username,
                email: this.testUser.email,
                password: this.testUser.password,
                firstName: 'Test',
                lastName: 'User'
            };
            
            const response = await this.axios.post('/api/auth/register', userData);

            if (response.status === 201) {
                console.log('✅ Usuário registrado com sucesso');
                return true;
            }
            
            return false;
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('⚠️  Usuário já existe, continuando...');
                return true; // Usuário já existe, podemos prosseguir
            }
            
            console.log(`❌ Falha no registro: ${error.response?.status || 'sem conexão'} - ${error.response?.data?.message || error.message}`);
            return false;
        }
    }  // Fazer login e obter token
  async loginTestUser() {
    console.log('🔑 Fazendo login...');
    
    try {
      const response = await this.axios.post('/api/auth/login', {
        identifier: this.testUser.email,
        password: this.testUser.password
      });

      if (response.status === 200 && response.data.data?.token) {
        this.token = response.data.data.token;
        console.log('✅ Login realizado com sucesso');
        return { success: true, token: this.token };
      } else {
        console.log(`❌ Falha no login: ${response.status} - ${response.data?.message || 'Erro desconhecido'}`);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.log(`❌ Erro na requisição de login: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Testar acesso a rota protegida
  async testProtectedRoute(endpoint = '/api/tasks') {
    if (!this.token) {
      return { success: false, error: 'Token não disponível' };
    }

    try {
      const response = await this.axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Configurar autenticação completa
  async setupAuthentication() {
    console.log('\n🚀 Configurando autenticação para testes...');
    
    // Registrar usuário
    const registerResult = await this.registerTestUser();
    if (!registerResult) {
      throw new Error('Falha ao registrar usuário de teste');
    }

    // Fazer login
    const loginResult = await this.loginTestUser();
    if (!loginResult.success) {
      throw new Error('Falha ao fazer login com usuário de teste');
    }

    // Testar acesso protegido
    const testResult = await this.testProtectedRoute();
    if (!testResult.success) {
      console.log('⚠️  Aviso: Falha ao acessar rota protegida, mas token foi obtido');
    } else {
      console.log('✅ Autenticação configurada e testada com sucesso');
    }

    return {
      success: true,
      token: this.token,
      user: this.testUser
    };
  }

  // Obter cabeçalho de autorização
  getAuthHeader() {
    if (!this.token) {
      throw new Error('Token não disponível. Execute setupAuthentication() primeiro.');
    }
    return { 'Authorization': `Bearer ${this.token}` };
  }

  // Limpar dados de teste (opcional)
  async cleanup() {
    // Note: Este método seria implementado se a API tivesse endpoint de deleção de usuário
    console.log('🧹 Limpeza de dados de teste (método não implementado na API)');
  }

  // Testar múltiplos cenários de autenticação
  async testAuthenticationScenarios() {
    console.log('\n🔍 Testando cenários de autenticação...');
    
    const results = {
      registerSuccess: false,
      loginSuccess: false,
      protectedAccess: false,
      invalidLogin: false,
      noTokenAccess: false
    };

    try {
      // 1. Registro
      const registerResult = await this.registerTestUser();
      results.registerSuccess = registerResult.success || registerResult.userExists;

      // 2. Login válido
      const loginResult = await this.loginTestUser();
      results.loginSuccess = loginResult.success;

      // 3. Acesso protegido com token válido
      if (this.token) {
        const protectedResult = await this.testProtectedRoute();
        results.protectedAccess = protectedResult.success;
      }

      // 4. Login inválido
      try {
        const invalidResponse = await this.axios.post('/api/auth/login', {
          email: this.testUser.email,
          password: 'senhaincorreta'
        });
        results.invalidLogin = invalidResponse.status === 401;
      } catch (error) {
        results.invalidLogin = true; // Erro esperado
      }

      // 5. Acesso sem token
      try {
        const noTokenResponse = await this.axios.get('/api/tasks');
        results.noTokenAccess = noTokenResponse.status === 401;
      } catch (error) {
        results.noTokenAccess = true; // Erro esperado
      }

    } catch (error) {
      console.log(`❌ Erro nos testes de autenticação: ${error.message}`);
    }

    return results;
  }
}

// Função utilitária para uso em outros testes
async function getAuthenticatedAxios(baseUrl = config.server.baseUrl) {
  const authTester = new AuthTester(baseUrl);
  await authTester.setupAuthentication();
  
  return axios.create({
    baseURL: baseUrl,
    timeout: config.server.timeout,
    headers: authTester.getAuthHeader(),
    validateStatus: () => true
  });
}

// Teste independente de autenticação
async function runAuthTest() {
  console.log('\n🔐 TESTE DE AUTENTICAÇÃO');
  console.log('========================');

  const authTester = new AuthTester();
  
  try {
    // Configurar autenticação
    await authTester.setupAuthentication();
    
    // Testar cenários
    const results = await authTester.testAuthenticationScenarios();
    
    // Relatório
    console.log('\n📊 RESULTADOS DOS TESTES DE AUTENTICAÇÃO:');
    console.log(`✅ Registro: ${results.registerSuccess ? 'SUCESSO' : 'FALHA'}`);
    console.log(`✅ Login: ${results.loginSuccess ? 'SUCESSO' : 'FALHA'}`);
    console.log(`✅ Acesso protegido: ${results.protectedAccess ? 'SUCESSO' : 'FALHA'}`);
    console.log(`✅ Login inválido rejeitado: ${results.invalidLogin ? 'SUCESSO' : 'FALHA'}`);
    console.log(`✅ Acesso sem token rejeitado: ${results.noTokenAccess ? 'SUCESSO' : 'FALHA'}`);
    
    const score = Object.values(results).filter(Boolean).length * 20;
    console.log(`\n🎯 SCORE DE AUTENTICAÇÃO: ${score}/100`);
    
    return { success: true, results, score };
    
  } catch (error) {
    console.log(`❌ Erro no teste de autenticação: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  AuthTester,
  getAuthenticatedAxios,
  runAuthTest
};

// Executar teste se chamado diretamente
if (require.main === module) {
  runAuthTest()
    .then(result => {
      console.log('\n🏁 Teste de autenticação concluído');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}
