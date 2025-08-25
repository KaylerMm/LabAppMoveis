#!/bin/bash

# Script de Instalação Automatizada para Suite de Testes
# =======================================================

set -e  # Parar em caso de erro

echo "🚀 INSTALANDO SUITE DE TESTES - TASK API"
echo "========================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_color() {
    printf "${2}${1}${NC}\n"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    print_color "❌ Erro: Arquivo package.json não encontrado!" $RED
    print_color "📍 Execute este script dentro do diretório /tests/" $YELLOW
    exit 1
fi

print_color "📦 Verificando Node.js..." $BLUE

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_color "❌ Node.js não está instalado!" $RED
    print_color "📥 Instale Node.js: https://nodejs.org/" $YELLOW
    exit 1
fi

NODE_VERSION=$(node --version)
print_color "✅ Node.js encontrado: $NODE_VERSION" $GREEN

# Verificar npm
if ! command -v npm &> /dev/null; then
    print_color "❌ npm não está instalado!" $RED
    exit 1
fi

NPM_VERSION=$(npm --version)
print_color "✅ npm encontrado: v$NPM_VERSION" $GREEN

print_color "📦 Instalando dependências..." $BLUE

# Instalar dependências
if npm install; then
    print_color "✅ Dependências instaladas com sucesso!" $GREEN
else
    print_color "❌ Erro ao instalar dependências!" $RED
    exit 1
fi

print_color "🔧 Configurando ambiente..." $BLUE

# Criar arquivo de configuração de ambiente (se não existir)
if [ ! -f ".env.example" ]; then
    cat > .env.example << EOL
# Configurações da Suite de Testes
TEST_BASE_URL=http://localhost:3000
TEST_TIMEOUT=10000
TEST_CONCURRENT_REQUESTS=50
TEST_ITERATIONS=100
TEST_RATE_REQUESTS=120
TEST_BRUTE_FORCE_ATTEMPTS=20
TEST_USERNAME=testuser_$(date +%s)
TEST_EMAIL=test_$(date +%s)@example.com
TEST_PASSWORD=TestPassword123!
TEST_NAME=Test User
EOL
    print_color "✅ Arquivo .env.example criado" $GREEN
fi

print_color "🧪 Testando instalação..." $BLUE

# Testar se os scripts funcionam
if node index.js help > /dev/null 2>&1; then
    print_color "✅ Scripts funcionando corretamente!" $GREEN
else
    print_color "⚠️  Aviso: Problemas nos scripts detectados" $YELLOW
fi

print_color "🔍 Verificando servidor..." $BLUE

# Verificar se o servidor está rodando
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    print_color "✅ Servidor está rodando em http://localhost:3000" $GREEN
    SERVIDOR_OK=true
else
    print_color "⚠️  Servidor não está rodando em http://localhost:3000" $YELLOW
    print_color "📝 Inicie o servidor antes de executar os testes" $YELLOW
    SERVIDOR_OK=false
fi

echo ""
print_color "🎉 INSTALAÇÃO CONCLUÍDA!" $GREEN
echo "========================================"

print_color "📋 COMANDOS DISPONÍVEIS:" $BLUE
echo ""
echo "  npm test                    # Teste completo"
echo "  npm run test:quick          # Teste rápido"
echo "  npm run test:stress         # Testes de estresse"
echo "  npm run test:security       # Testes de segurança"
echo "  npm run test:auth           # Testes de autenticação"
echo "  npm run test:examples       # Exemplos de uso"
echo "  npm run help                # Ajuda"
echo ""

print_color "🔧 CONFIGURAÇÃO:" $BLUE
echo ""
echo "  # Personalizar URL do servidor:"
echo "  export TEST_BASE_URL=http://localhost:3000"
echo ""
echo "  # Ajustar timeout:"
echo "  export TEST_TIMEOUT=15000"
echo ""
echo "  # Configurar requests concorrentes:"
echo "  export TEST_CONCURRENT_REQUESTS=25"
echo ""

if [ "$SERVIDOR_OK" = true ]; then
    print_color "🚀 PRONTO PARA USAR!" $GREEN
    echo ""
    print_color "Execute um teste rápido:" $BLUE
    echo "  npm run test:quick"
    echo ""
else
    print_color "⚠️  PRÓXIMOS PASSOS:" $YELLOW
    echo ""
    echo "1. Inicie o servidor da API:"
    echo "   cd .. && npm start"
    echo ""
    echo "2. Execute um teste rápido:"
    echo "   npm run test:quick"
    echo ""
fi

print_color "📚 DOCUMENTAÇÃO:" $BLUE
echo ""
echo "  README-TESTES.md           # Documentação completa"
echo "  example-usage.js           # Exemplos práticos"
echo "  node index.js help         # Ajuda interativa"
echo ""

print_color "⚠️  IMPORTANTE:" $YELLOW
echo ""
echo "  • Execute apenas em ambiente de desenvolvimento"
echo "  • NUNCA execute em produção"
echo "  • Alguns testes podem criar dados temporários"
echo "  • Monitore logs durante execução"
echo ""

# Verificar permissões do script
chmod +x install-tests.sh 2>/dev/null || true

print_color "✅ Instalação finalizada com sucesso!" $GREEN
print_color "🚀 Suite de testes pronta para uso!" $GREEN

exit 0
