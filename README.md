# APS — Focos de Incêndio em SP

Atividade Prática Supervisionada (Ciência da Computação, UNIP, 2026/2), disciplina de **Estrutura de Dados**.

O programa lê os focos de incêndio detectados por satélite no estado de **São Paulo** em 2023 e 2024 (dados do INPE),
ordena os dados com algoritmos implementados à mão, conta as operações de cada ordenação e mostra
os resultados num dashboard web.

## Dados

Os CSVs estão em `data/` e vêm de:
https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/anual/EstadosBr_sat_ref/

| Arquivo | Focos |
|---|---|
| `focos_br_sp_ref_2023.csv` | 1.666 |
| `focos_br_sp_ref_2024.csv` | 8.712 |

## Tecnologias

- Java 21 + Maven
- [Javalin](https://javalin.io/) (API REST e arquivos estáticos)
- HTML/JS no dashboard
- JUnit 5

## Como rodar

Abra o projeto no IntelliJ e rode `br.unip.aps.App`. Depois acesse http://localhost:7070.

O dashboard tem cinco páginas (menu no topo):

| Página | Arquivo | O que mostra |
|---|---|---|
| **Sobre o projeto** | `index.html` | objetivo, contexto, os dados, como o sistema funciona, como as operações são medidas e os 6 algoritmos explicados |
| **Ordenação** | `ordenacao.html` | escolhe critério, algoritmo e ano; mostra comparações, trocas e tempo, a tabela paginada na ordem obtida e o mapa por bioma |
| **Comparativo** | `comparativo.html` | os 6 algoritmos na mesma entrada (gráfico em escala log + tabela), conclusões automáticas e a tabela algoritmo × critério |
| **Estatísticas** | `estatisticas.html` | focos por mês (por bioma), por bioma e ranking de municípios, com filtro de ano |
| **Previsões** | `previsoes.html` | cenários de focos por mês, calendário de prevenção, mapa e ranking de prioridade dos municípios, plano de contenção e validação 2023 → 2024 |

> Os gráficos (Chart.js) e o mapa (Leaflet) vêm da internet. Sem conexão, a ordenação e a tabela
> continuam funcionando e o dashboard avisa o que não carregou.

**Integrantes do grupo:** leiam o [guia do grupo](CONTRIBUTING.md) antes de começar.

## Estrutura

```
src/main/java/br/unip/aps/
├── App.java          ← sobe o servidor
├── model/            ← FocoIncendio
├── io/               ← leitura dos CSVs
├── sort/             ← algoritmos de ordenação e métricas
├── service/          ← ordenação com métricas e estatísticas
└── web/              ← endpoints REST
src/main/resources/public/   ← dashboard (uma página HTML + um .js por tela; comum.js e style.css compartilhados)
src/test/java/               ← testes dos algoritmos
```

## API

| Endpoint | O que faz |
|---|---|
| `GET /api/status` | status, total de focos e anos disponíveis |
| `GET /api/opcoes` | critérios, algoritmos (com complexidade e estabilidade) e anos, para os seletores do dashboard |
| `GET /api/ordenar?criterio=MUNICIPIO&algoritmo=MERGE[&ano=2024]` | ordena e devolve comparações, trocas, tempo e os focos ordenados |
| `GET /api/comparar?criterio=DATA[&ano=2024]` | roda os 6 algoritmos na mesma entrada e devolve só as métricas |
| `GET /api/estatisticas[?ano=2024][&top=10]` | focos por ano, por mês, por bioma e ranking de municípios |
| `GET /api/previsoes[?top=20]` | perfil sazonal e cenários, janela crítica, índice de prioridade por município, áreas recorrentes e validação retroativa |

Exemplos para abrir no navegador com o App rodando:
- http://localhost:7070/api/ordenar?criterio=BIOMA&algoritmo=QUICK&ano=2023
- http://localhost:7070/api/estatisticas?top=5

Parâmetro inválido ou ausente responde **400** com `{"erro": "..."}` explicando os valores aceitos.

## Progresso

- [x] Estrutura do projeto
- [x] Leitura dos CSVs
- [x] Critérios de ordenação (data, bioma, município)
- [x] Algoritmos: Bubble, Insertion, Selection, Merge, Quick, Heap
- [x] Endpoint de ordenação com métricas
- [x] Dashboard (tabela, gráficos, mapa)
- [x] Comparativo dos 6 algoritmos
