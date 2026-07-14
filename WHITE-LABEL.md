# Guia White Label

Esta branch (`whitelabel-template`) é uma versão de marca neutra da aplicação,
pronta para ser duplicada para um novo cliente. Toda a lógica, base de dados,
autenticação e traduções (PT/EN) são idênticas à versão original.

## O que muda por cliente

Só precisa de tocar em **três sítios**:

### 1. Nome, logótipo e textos: `lib/brand.js`
```js
export const BRAND = {
  name: 'AUTO DEALER',                 // nome apresentado
  tagline: 'CAR DEALER MANAGEMENT',    // assinatura
  logo: '/logo-brand.svg',             // ficheiro em public/
  logoAlt: 'AUTO DEALER',
  metaTitle: 'AUTO DEALER - Car Dealer Management',
  metaDescription: 'Gestão de viaturas',
};
```

### 2. Logótipo: `public/logo-brand.svg`
Substitua por um SVG, PNG ou JPEG do cliente e ajuste o caminho em `brand.js`.

### 3. Cores: `app/globals.css`
Altere os valores hexadecimais no bloco `@theme`. A cor de destaque usa a
família `--color-octane-gold` (o nome da classe é interno e não precisa mudar).

## Criar um novo projeto a partir desta branch

```bash
# 1. Criar um novo repositório vazio no GitHub (ex: cliente-x)

# 2. A partir desta branch, enviar o código para o novo repositório
git clone --single-branch --branch whitelabel-template <URL_ORIGINAL> cliente-x
cd cliente-x
git remote set-url origin <URL_NOVO_REPOSITORIO>
git push -u origin whitelabel-template:main

# 3. No Vercel: importar o novo repositório e configurar as variáveis de ambiente
#    TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET  (base de dados própria por cliente)
```

Cada cliente deve ter a **sua própria base de dados Turso** e o **seu próprio
JWT_SECRET**, para total isolamento de dados.

## Checklist de rebrand

- [ ] `lib/brand.js` — nome, tagline, metadados
- [ ] `public/logo-brand.svg` — logótipo do cliente
- [ ] `app/globals.css` — cores da marca
- [ ] Variáveis de ambiente no Vercel (base de dados própria)
- [ ] (Opcional) `public/favicon` do cliente
