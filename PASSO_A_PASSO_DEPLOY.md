# 🚀 PASSO A PASSO DE DEPLOY — LMG PLATAFORMA FINANCEIRA

Siga este roteiro para garantir um deploy seguro, rastreável e reversível. Use junto ao checklist de produção.

---

## 1. Pré-Deploy

- [ ] Confirme que todos os itens do CHECKLIST_DEPLOY_PRODUCAO.md estão validados
- [ ] Faça backup do banco de dados de produção
- [ ] Garanta acesso aos logs e monitoramento

## 2. Deploy

1. **Atualize o código no servidor de produção**
   - Exemplo: `git pull origin main` ou deploy via CI/CD
2. **Instale dependências**
   - Exemplo: `npm install` ou `yarn install`
3. **Aplique migrations do banco de dados**
   - Exemplo: `npx prisma migrate deploy`
4. **Execute seeds se necessário**
   - Exemplo: `npx prisma db seed`
5. **Reinicie o serviço da aplicação**
   - Exemplo: `pm2 restart app` ou `systemctl restart <serviço>`

## 3. Pós-Deploy (Smoke Tests)

- [ ] Login/logout
- [ ] Dashboard carrega dados reais
- [ ] Edição de transação e orçamento
- [ ] Projeções e metas atualizam corretamente
- [ ] Navegação entre telas sem erro
- [ ] Logs e monitoramento capturam eventos

## 4. Rollback (se necessário)

- [ ] Restaure backup do banco de dados
- [ ] Refaça deploy da versão anterior
- [ ] Valide funcionamento básico

---

> Dica: Documente qualquer anomalia ou ajuste feito durante o processo para aprendizado futuro.

**Responsável:**

Data: **/**/\_\_\_\_

Versão/Release: **\_\_\_\_**
