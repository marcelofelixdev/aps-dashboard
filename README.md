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

**Integrantes do grupo:** leiam o [guia do grupo](CONTRIBUTING.md) antes de começar.

## Estrutura

```
src/main/java/br/unip/aps/
├── App.java          ← sobe o servidor
├── model/            ← FocoIncendio
├── io/               ← leitura dos CSVs
└── sort/             ← algoritmos de ordenação e métricas
src/main/resources/public/   ← dashboard
src/test/java/               ← testes dos algoritmos
```

## Progresso

- [x] Estrutura do projeto
- [x] Leitura dos CSVs
- [x] Critérios de ordenação (data, bioma, município)
- [x] Algoritmos: Bubble, Insertion, Selection, Merge, Quick, Heap
- [ ] Endpoint de ordenação com métricas
- [ ] Dashboard (tabela, gráficos, mapa)
