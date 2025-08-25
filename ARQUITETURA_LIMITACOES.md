# Limitações Arquiteturais do Projeto

1. **Cache em memória**
   - O cache é volátil e não é compartilhado entre múltiplas instâncias do servidor. Em ambientes distribuídos, pode haver inconsistências.

2. **Banco SQLite**
   - O uso de SQLite limita concorrência e escalabilidade. Para muitos usuários ou alta carga, bancos como PostgreSQL ou MySQL são recomendados.

3. **Rate Limiting em memória**
   - O rate limiting é feito em memória, não persistente. Em múltiplos servidores, o controle pode ser burlado.

4. **Ausência de testes automatizados**
   - Não há testes unitários ou de integração presentes no projeto.

5. **Documentação básica**
   - A documentação está em Markdown, não interativa (ex: Swagger).

6. **Validação de dados**
   - A validação depende do middleware, mas pode ser aprimorada para garantir integridade dos dados.

7. **Logs**
   - Logs são apenas no console. Para produção, recomenda-se persistência em arquivo ou serviço externo.

8. **Autenticação**
   - O middleware de autenticação deve ser revisado para garantir uso correto de JWT e segurança.

9. **Tags e categorias**
   - O filtro por tags depende de LIKE, o que pode ser ineficiente para grandes volumes de dados.

10. **Escalabilidade**
    - O projeto é adequado para uso individual ou pequenos grupos, mas não para alta escala sem adaptações.
