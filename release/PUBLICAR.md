# Como publicar o PUNK HUB

Você só precisa de uma conta no GitHub. Não precisa instalar Node, Android Studio nem nada no seu computador para publicar.

## Primeira vez

1. No GitHub, crie um repositório novo (público, para os downloads ficarem gratuitos), por exemplo `punk-hub`.
2. Envie o conteúdo desta pasta para ele (botão Add file > Upload files, ou `git push`).
3. Em Settings > Actions > General, marque "Read and write permissions" e salve.
4. Crie a primeira versão: Releases > Draft a new release > crie a tag `v1.1.0` > Publish.
   O GitHub compila sozinho o instalador do Windows (.exe) e o do Android (.apk) e anexa os dois ao Release.
   Leva uns 15 a 20 minutos. Acompanhe na aba Actions.

O app descobre sozinho de qual repositório vem, então não há nada para configurar dentro dele.

## Versões novas

1. Edite o que quiser em `hub/src`.
2. Rode `node tools/lancar.js 1.2.0` (com o número da nova versão). Ele atualiza tudo e mostra 4 comandos para colar.
3. O GitHub compila e publica. Quem já tem o app recebe o aviso de atualização em até um dia (ou ao tocar em
   Configurações > Sistema > Verificar atualizações).

## Se algo falhar

- Aba Actions > clique na execução com X vermelho > veja qual passo falhou e o texto do erro.
- "Versões diferentes" ou "tag não bate": rode `node tools/lancar.js <versão>` de novo.
- O instalador do Windows não tem assinatura digital paga. O Windows pode mostrar "O Windows protegeu seu PC":
  clique em Mais informações > Executar assim mesmo. Isso só some com um certificado de assinatura (pago).
- O APK é assinado com uma chave de depuração fixa que está no repositório (`android/signing`). Serve para instalar
  e atualizar por cima, mas qualquer pessoa com acesso ao repositório poderia assinar um APK com a mesma chave.
  Para publicar na Play Store ou para mais segurança, use uma chave própria.

## Site (GitHub Pages)

O site fica separado do app, na pasta `site/`. Ele mostra versão, novidades, número de downloads e os botões de
download direto do EXE e do APK, destacando o do aparelho de quem visita. Tudo vem do último Release, então não
precisa editar o site a cada versão.

Para ligar (uma vez só):
1. No repositório: Settings > Pages > Source: escolha "GitHub Actions".
2. Qualquer envio que mexa na pasta `site/` publica o site sozinho (aba Actions > "Publicar site").
3. O endereço será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`. O site descobre o repositório pelo próprio
   endereço, sem configurar nada. Para testar fora do GitHub, abra `site/index.html` com `?repo=usuario/repositorio`.

O repositório precisa ser público para o site conseguir ler os Releases sem login.
