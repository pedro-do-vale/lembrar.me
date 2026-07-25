# 🎙️ Lembrar.me Watch (VoiceNoteWatch) ⌚

O **Lembrar.me Watch** é um aplicativo nativo para Android/WearOS (otimizado para relógios inteligentes, como Microwear Ultra AI 3 e afins rodando Android completo). Este aplicativo funciona como a interface principal de captura de produtividade do sistema **Lembrar.me**, integrando reconhecimento de voz, gerenciamento de tarefas nativo e sincronização em tempo real com a nuvem (Firebase Firestore).

Construído sob um esquema "Dark Apple / Neon", a interface prioriza o minimalismo e a agilidade nas rotinas diárias, permitindo a captura de ideias ou tarefas com apenas um toque, enquanto dirige ou caminha.

---

## ⌚ Funcionalidades Principais

*   **Botão de Gravação Gigante (140dp)**: Interface focada em usabilidade sem olhar (eyes-free). Conta com design Neon *Cyan* (ocioso) e *Pink* (captando). Não é necessário precisão extrema no toque para começar a falar.
*   **Transcrição Inteligente (Speech-to-Text)**: Utiliza a API nativa do Android (`SpeechRecognizer`) para converter sua voz em texto de forma agil, aplicando regras de capitalização (primeira letra maiúscula) de forma autônoma.
*   **Sincronização em Tempo Real (Cloud Firestore)**: Integração nativa usando `SnapshotListener`. As notas e tarefas são enviadas quase simultaneamente para a Dashboard Web.
*   **Suporte Offline Nativo via Firebase**: Se o relógio perder conexão com o sinal de internet ou Wi-Fi, a tarefa transcrita é armazenada em um cache persistido e sincronizada automaticamente em background assim que a rede for restabelecida.
*   **Integração de Tarefas (To-Do List)**: Uma aba secundária que exibe todas as tarefas ativas na nuvem. Você pode alternar o status para "concluído" (checkbox) ou excluir notas diretamente pelo display restrito do relógio.
*   **Lembretes Nativos (AlarmManager)**: Lê a propriedade de agendamento (alarme) do banco de dados e registra a notificação de forma local no sistema operacional do relógio, ativando canal de Notificações, som e vibração no pulso na hora exata, sem depender de "Silent Push".
*   **Roteamento por Voz (NLP Básico)**: Fale "abacaxi e morango lista compras" e o aplicativo inteligentemente detectará a keyword "lista", salvando o conteúdo no Kanban/lista exato definido pelo usuário.
*   **Super Leve**: Mantido no mínimo de dependências e compilado no esquema `v2` de assinaturas, assegurando alta fluidez também em aparelhos de baixo processamento ou baixa bateria.

---

## 🛠️ Detalhes Técnicos

*   **Linguagem**: Kotlin
*   **Minimum SDK**: 24 (Android 7.0) - Isso garante retrocompatibilidade com uma enorme variedade de "Smartwatches completos chineses" (Ex: Microwear, Zeblaze, etc.) que rodam versões mais antigas do Android AOSP.
*   **Target SDK**: 33 (Android 13)
*   **Arquitetura de UI**: ViewBinding (para manipulação direta das Activities e Adapters em substituição ao `findViewById`).
*   **Ferramentas de Layout**: ConstraintLayout para interface responsiva até em telas quadradas ou redondas de menor polegada. RecyclerView com layout otimizado.

---

## 🚀 Como Compilar e Rodar o Projeto

1.  **Pré-requisitos**:
    *   Java JDK 17
    *   Android SDK configurado corretamente na variável `ANDROID_HOME_PATH`.
    *   Gradle 8.4 (ou utilizar o wrapper).
2.  **Configurando o Firebase Service**:
    *   Este projeto exige um banco de dados **Google Cloud Firestore**.
    *   Vá ao console do Firebase, registre este aplicativo Android (`com.example.voicenote`) e faça download do arquivo `google-services.json`.
    *   Copie e cole esse arquivo no caminho raiz do pacote: `/app/google-services.json`. (Ele foi adicionado ao `.gitignore` por razões de segurança de acessos públicos no GitHub).
3.  **Terminal Build (Sem Android Studio)**:
    Abra seu prompt na raiz da pasta `VoiceNoteWatch` e rode:
    ```bash
    # Para sistemas Linux/macOS
    ./gradlew clean assembleDebug

    # Para sistemas Windows
    .\gradlew.bat clean assembleDebug
    ```
4.  **Localizando o APK**:
    Após a compilação, o pacote será gerado com as assinaturas completas `v1 + v2` (que previnem o bloqueio durante a instalação no relógio), e ficará acessível no caminho:
    `app/build/outputs/apk/debug/app-debug.apk`

---

## 🔑 Banco de Dados e Segurança

Se for realizar o *fork* ou recriar a estrutura para si mesmo, tenha certeza de habilitar o banco do Firestore e ajustar as **Rules** de acesso.
Vale notar que as notas utilizam os seguintes campos de dados na nuvem: `text` (String), `date` (String), `timestamp` (Long), `archived` (Boolean), `targetList` (String, opcional para Kanban) e `reminderAt` (Long, opcional para alarme nativo).

---
*Para um ecosistema completo, utilize-o em conjunto com a aplicação VoiceNoteWeb (ReactJS).*
