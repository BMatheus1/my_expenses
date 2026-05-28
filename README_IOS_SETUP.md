# My Expenses - iOS setup

Este projeto ja esta preparado para Android com Capacitor. Este guia serve para iniciar o iOS com seguranca, usando o mesmo build nativo do Android e sem alterar a pasta Android sem necessidade.

## Pontos importantes

- iOS precisa de um Mac com Xcode instalado para compilar, assinar e publicar.
- Windows consegue preparar codigo, scripts e documentacao, mas nao compila iOS localmente.
- A pasta `frontend/ios` nao deve ser criada em Windows se voce nao consegue validar com Xcode.
- O app nativo deve abrir direto em `/app/`, conforme `frontend/capacitor.config.ts`.

## Passos no Mac

Entre na pasta do frontend:

```bash
cd frontend
```

Instale as dependencias do projeto:

```bash
npm install
```

Gere o build nativo compartilhado por Android e iOS:

```bash
npm run build:native
```

Se `@capacitor/ios` ainda nao estiver instalado no projeto, instale mantendo a versao do Capacitor alinhada com Android/Core:

```bash
npm install @capacitor/ios@^7.6.5 --save
```

Crie a plataforma iOS somente no Mac:

```bash
npx cap add ios
```

Sincronize o build web e plugins com o projeto iOS:

```bash
npm run sync:ios
```

Abra no Xcode:

```bash
npm run open:ios
```

No Xcode:

- Configure `Signing & Capabilities` com sua Apple Developer Team.
- Confirme o bundle identifier `com.myexpensesfinance.app`.
- Revise `Info.plist` antes de testar recursos que exigem permissoes.
- Teste primeiro no simulador.
- Teste depois em um iPhone real, principalmente login social e notificacoes.
- Para TestFlight, gere um Archive no Xcode e envie pelo Organizer.

## Checklist iOS

- [ ] Nome do app: `My Expenses`.
- [ ] Bundle identifier: `com.myexpensesfinance.app`.
- [ ] Icone iOS revisado no Asset Catalog gerado pelo Capacitor/Xcode.
- [ ] Splash screen iOS revisada no Xcode.
- [ ] Notificacoes locais iOS testadas com solicitacao de permissao.
- [ ] Google Login iOS configurado no Google Cloud/Firebase, se usado em producao.
- [ ] Apple Login configurado no Apple Developer, se usado em producao.
- [ ] Permissoes e URL schemes revisados no `Info.plist`.
- [ ] Teste no simulador concluido.
- [ ] Teste em iPhone real concluido.
- [ ] Build para TestFlight gerado e enviado.

## Alertas para publicacao

- Google Login no iOS normalmente exige client/configuracao propria para iOS, URL scheme e bundle identifier corretos.
- Apple Login exige Apple Developer Program ativo e capability configurada no Xcode.
- Notificacoes locais no iOS precisam de permissao explicita do usuario e devem ser testadas em dispositivo real antes do TestFlight.
- TestFlight exige assinatura valida, App Store Connect configurado e version/build number coerentes.
