const config = {
  // Configurações do servidor
  server: {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.TEST_TIMEOUT) || 10000,
    retryAttempts: parseInt(process.env.TEST_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.TEST_RETRY_DELAY) || 1000
  },

  // Configurações de rate limiting
  rateLimit: {
    public: {
      maxRequests: parseInt(process.env.TEST_PUBLIC_RATE_LIMIT) || 100,
      windowMs: parseInt(process.env.TEST_PUBLIC_WINDOW_MS) || 900000 // 15 min
    },
    authenticated: {
      maxRequests: parseInt(process.env.TEST_AUTH_RATE_LIMIT) || 500,
      windowMs: parseInt(process.env.TEST_AUTH_WINDOW_MS) || 900000 // 15 min
    }
  },

  // Configurações de teste de estresse
  stress: {
    concurrentRequests: parseInt(process.env.TEST_CONCURRENT_REQUESTS) || 50,
    iterations: parseInt(process.env.TEST_ITERATIONS) || 100,
    rateTestRequests: parseInt(process.env.TEST_RATE_REQUESTS) || 120,
    testDuration: parseInt(process.env.TEST_DURATION) || 30000, // 30 segundos
    packetLossThreshold: parseFloat(process.env.TEST_PACKET_LOSS_THRESHOLD) || 0.05 // 5%
  },

  // Configurações de teste de segurança
  security: {
    bruteForceAttempts: parseInt(process.env.TEST_BRUTE_FORCE_ATTEMPTS) || 20,
    maliciousPayloads: {
      sqlInjection: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*",
        "' OR 1=1#",
        "' OR 'x'='x",
        "1' ORDER BY 1--+",
        "1' ORDER BY 2--+",
        "1' GROUP BY 1,2,3,4,5--+"
      ],
      xss: [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "'><script>alert('XSS')</script>",
        "\"><script>alert('XSS')</script>",
        "<iframe src=javascript:alert('XSS')>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
        "<select onfocus=alert('XSS') autofocus>"
      ],
      pathTraversal: [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "..%252f..%252f..%252fetc%252fpasswd",
        "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
        "../../../proc/self/environ",
        "../../../../boot.ini",
        "../../../../../../etc/shadow",
        "../../../var/log/apache2/access.log"
      ],
      headers: [
        { 'X-Forwarded-For': '127.0.0.1; rm -rf /' },
        { 'User-Agent': '<script>alert("XSS")</script>' },
        { 'Referer': 'javascript:alert("XSS")' },
        { 'X-Real-IP': '0.0.0.0' },
        { 'X-Originating-IP': '127.0.0.1' },
        { 'X-Remote-IP': '127.0.0.1' },
        { 'X-Remote-Addr': '127.0.0.1' },
        { 'X-Cluster-Client-IP': '127.0.0.1' },
        { 'Host': 'evil.com' },
        { 'Content-Type': 'application/json; charset=utf-7' }
      ],
      jwtBypass: [
        "null",
        "undefined",
        "",
        "Bearer ",
        "Bearer null",
        "Bearer undefined",
        "Bearer invalid.token.here",
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.INVALID",
        "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.",
        "Basic YWRtaW46YWRtaW4="
      ]
    }
  },

  // Configurações de teste de usuário
  testUser: {
    username: process.env.TEST_USERNAME || `testuser${Date.now().toString().slice(-6)}`,
    email: process.env.TEST_EMAIL || `test${Date.now().toString().slice(-6)}@example.com`,
    password: process.env.TEST_PASSWORD || 'TestPassword123!',
    name: process.env.TEST_NAME || 'Test User'
  },

  // Configurações de scoring
  scoring: {
    maxScore: 100,
    weights: {
      rateLimit: 25,
      security: 40,
      performance: 20,
      reliability: 15
    },
    thresholds: {
      excellent: 90,
      good: 75,
      average: 60,
      poor: 40
    }
  },

  // Configurações de relatório
  report: {
    detailed: process.env.TEST_DETAILED_REPORT !== 'false',
    saveToFile: process.env.TEST_SAVE_REPORT === 'true',
    reportPath: process.env.TEST_REPORT_PATH || './test-report.json'
  },

  // Endpoints para teste
  endpoints: {
    public: [
      '/',
      '/health',
      '/api/auth/register',
      '/api/auth/login'
    ],
    protected: [
      '/api/tasks',
      '/api/tasks/1'
    ]
  }
};

// Validação de configuração
function validateConfig() {
  const errors = [];

  if (!config.server.baseUrl) {
    errors.push('Base URL é obrigatória');
  }

  if (config.server.timeout < 1000) {
    errors.push('Timeout deve ser pelo menos 1000ms');
  }

  if (config.stress.concurrentRequests < 1) {
    errors.push('Número de requests concorrentes deve ser pelo menos 1');
  }

  if (config.stress.packetLossThreshold < 0 || config.stress.packetLossThreshold > 1) {
    errors.push('Threshold de perda de pacotes deve estar entre 0 e 1');
  }

  if (errors.length > 0) {
    throw new Error(`Erro de configuração: ${errors.join(', ')}`);
  }
}

// Função para obter configuração do ambiente
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      verbose: true,
      strictMode: false
    },
    test: {
      verbose: false,
      strictMode: true
    },
    production: {
      verbose: false,
      strictMode: true,
      security: {
        ...config.security,
        bruteForceAttempts: 5 // Menos agressivo em produção
      }
    }
  };

  return { ...config, ...envConfigs[env] };
}

module.exports = {
  ...config,
  validateConfig,
  getEnvironmentConfig
};
