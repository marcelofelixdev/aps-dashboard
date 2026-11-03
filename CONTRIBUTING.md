# Guia do grupo

Como trabalhar neste projeto sem um atrapalhar o outro. Leia tudo antes de começar.

## 1. Preparar o ambiente (uma vez só)

1. Instale o **JDK 21** e o **IntelliJ IDEA** (Community serve). O Maven já vem dentro do IntelliJ.
2. Clone o repositório:
   ```
   git clone https://github.com/marcelofelixdev/aps-dashboard.git
   ```
3. No IntelliJ: **File → Open** e escolha a pasta `aps-dashboard` (a que tem o `pom.xml`).
   Espere ele baixar as dependências (barra de progresso no canto inferior).
4. Rode `src/main/java/br/unip/aps/App.java` e abra http://localhost:7070.
   Se aparecer **"Status da API: ok"**, está tudo certo.

> **Erro "Port already in use"?** O App já está rodando em outra aba. Pare no botão vermelho ■ antes de rodar de novo.

## 2. Onde fica cada coisa

Esta é a estrutura **completa** combinada pelo grupo. ✅ = já existe, 📝 = existe com TODO, 🔲 = ainda vai ser criado.

```
aps-dashboard/
├── pom.xml                              ✅ dependências (Javalin, Jackson, JUnit)
├── data/                                ✅ CSVs do INPE — não editar
│   ├── focos_br_sp_ref_2023.csv            (1.666 focos)
│   └── focos_br_sp_ref_2024.csv            (8.712 focos)
└── src/
    ├── main/java/br/unip/aps/
    │   ├── App.java                     ✅ main: carrega os CSVs e sobe o servidor
    │   ├── model/
    │   │   └── FocoIncendio.java        ✅ record com os campos de uma linha
    │   ├── io/
    │   │   └── LeitorCsv.java           ✅ lê o arquivo e devolve List<FocoIncendio>
    │   ├── sort/                        ← ❤️ O CORAÇÃO DA APS
    │   │   ├── AlgoritmoOrdenacao.java  ✅ interface comum
    │   │   ├── Metricas.java            ✅ contador de comparações e trocas
    │   │   ├── Criterio.java            ✅ enum DATA, BIOMA, MUNICIPIO → Comparator
    │   │   ├── Algoritmo.java           ✅ enum BUBBLE, INSERTION... → cria o algoritmo (+ complexidade, estabilidade)
    │   │   ├── BubbleSort.java          ✅
    │   │   ├── InsertionSort.java       ✅
    │   │   ├── SelectionSort.java       ✅
    │   │   ├── MergeSort.java           ✅
    │   │   ├── QuickSort.java           ✅
    │   │   └── HeapSort.java            ✅
    │   ├── service/
    │   │   ├── OrdenacaoService.java    ✅ junta critério + algoritmo + métricas
    │   │   └── EstatisticaService.java  ✅ extras: focos por mês, por bioma, top municípios
    │   └── web/
    │       ├── ApiRoutes.java           ✅ endpoints REST do Javalin
    │       └── Parametros.java          ✅ converte e valida os parâmetros (400 se inválidos)
    ├── main/resources/public/           ← o dashboard (front)
    │   ├── index.html                   ✅ (por enquanto só mostra o status)
    │   ├── app.js                       🔲 chama a API e desenha com Chart.js e Leaflet
    │   └── style.css                    🔲
    └── test/java/br/unip/aps/
        ├── io/LeitorCsvTest.java        ✅ leitura dos CSVs reais e de linhas quebradas
        ├── service/                     ✅ OrdenacaoServiceTest, EstatisticaServiceTest
        ├── web/ParametrosTest.java      ✅ validação dos parâmetros
        └── sort/
            ├── CriterioTest.java        ✅ ordem e desempate de cada critério
            └── AlgoritmosTest.java      ✅ todo algoritmo tem que dar o mesmo resultado
```

### Responsabilidade de cada camada

| Pacote | Faz | Não faz |
|---|---|---|
| `model` | define o formato dos dados | lógica nenhuma |
| `io` | lê e converte o CSV | ordenar, HTTP |
| `sort` | ordena e conta operações | ler arquivo, saber que existe HTTP |
| `service` | escolhe algoritmo/critério, copia a lista, mede tempo, monta estatísticas | ler `ctx` do Javalin |
| `web` | recebe a requisição, valida parâmetros, devolve JSON | ordenar, calcular |
| `public` | mostra os dados (tabela, gráficos, mapa) | regra de negócio |

Se você está escrevendo `split(",")` dentro de um algoritmo de ordenação, ou um `for` de ordenação dentro do
`ApiRoutes`, está no lugar errado.

### Como uma requisição percorre o sistema

```
Navegador (app.js): GET /api/ordenar?criterio=BIOMA&algoritmo=MERGE
   → web/ApiRoutes           valida os parâmetros (400 se inválidos)
   → service/OrdenacaoService
        1. faz uma CÓPIA da lista original
        2. pega o Comparator do Criterio
        3. roda o algoritmo com uma Metricas nova
        4. mede o tempo (System.nanoTime)
   → devolve o JSON abaixo
```

⚠️ **Sempre ordene uma cópia** (`new ArrayList<>(focos)`). Se ordenar a lista original, a próxima requisição
recebe os dados já ordenados e as métricas ficam falsas.

### Contrato da API

`GET /api/ordenar?criterio={DATA|BIOMA|MUNICIPIO}&algoritmo={BUBBLE|INSERTION|SELECTION|MERGE|QUICK|HEAP}[&ano=2023|2024]`

```json
{
  "algoritmo": "Merge Sort",
  "criterio": "BIOMA",
  "ano": null,
  "comparacoes": 98427,
  "trocas": 139286,
  "tempoMs": 12.4,
  "total": 10378,
  "dados": [ { "dataHora": "2023-01-02T17:09:00", "municipio": "UCHOA", "bioma": "Mata Atlântica", "latitude": -20.93935, "longitude": -49.1255 } ]
}
```

- `ano` é opcional (ausente ou `todos` = os dois anos).
- Os parâmetros aceitam minúsculas, acento e o sufixo "sort" (`município`, `merge sort`).
- Erro de parâmetro: status **400** e `{"erro": "mensagem explicando os valores aceitos"}`.

Outros endpoints: `GET /api/opcoes` (valores dos seletores) e `GET /api/estatisticas[?ano=][&top=10]`
(focos `porAno`, `porMes`, `porBioma`, `topMunicipios`, cada item no formato `{"rotulo": "set/2024", "focos": 1234}`).

Front e back combinam por esse formato: quem faz o `app.js` pode começar antes do endpoint ficar pronto,
usando um JSON fixo nesse formato.

## 3. Regras dos algoritmos de ordenação

Esta é a parte que vale nota na disciplina de Estrutura de Dados.

- ❌ **Proibido** usar `Collections.sort`, `List.sort`, `Arrays.sort`, `stream().sorted()` dentro do `sort/`.
  O algoritmo tem que ser escrito por nós. (Nos testes pode, só como gabarito.)
- ✅ Todo algoritmo **implementa `AlgoritmoOrdenacao`**.
- ✅ Toda comparação passa pelo comparador e é contada com `metricas.incrementaComparacoes()`.
- ✅ Toda troca/movimentação de elemento é contada com `metricas.incrementaTrocas()`.
- ✅ O algoritmo ordena a lista recebida **no lugar** e não imprime nada no console.

### Truque para contar comparações sem esquecer nenhuma

Em vez de espalhar `contador++` pelo código, "embrulhe" o comparador no começo do método
(padrão **Decorator**, vale citar na dissertação):

```java
Comparator<T> contando = (a, b) -> {
    metricas.incrementaComparacoes();
    return comparador.compare(a, b);
};
// daqui pra baixo, use só o "contando"
```

As **trocas** cada algoritmo conta do seu jeito (o Merge Sort não troca, ele copia — conte cada cópia).

### Critérios e desempate

No `Criterio`, quando dois focos empatam no critério principal, o desempate é pela data:

- `DATA` → `dataHora`
- `BIOMA` → `bioma`, depois `dataHora`
- `MUNICIPIO` → `municipio`, depois `dataHora`

Isso tem a ver com **estabilidade**: Bubble, Insertion e Merge são estáveis (mantêm a ordem original dos empates);
Selection, Quick e Heap não são. Anote o que observar — entra na fundamentação teórica.

### Observação sobre os dados

Os CSVs vêm **quase** ordenados por data: a maior parte das linhas está em ordem, mas alguns focos aparecem
fora do lugar (ex.: um foco de 05/03 depois de focos de 10/04), e os dois anos são lidos em sequência.
Por isso, ordenar por `DATA` é bem mais barato que por `BIOMA` ou `MUNICIPIO` para os algoritmos que
aproveitam ordem prévia (Insertion e Bubble), mas **não** é o melhor caso perfeito (~n comparações):
cada foco fora do lugar obriga o Insertion a deslocar muitos elementos. O Selection Sort, ao contrário,
faz sempre o mesmo número de comparações, qualquer que seja a ordem da entrada.

Medição com os 10.378 focos (2023 + 2024):

| Algoritmo | Critério | Comparações | Trocas/movimentações |
|---|---|---:|---:|
| Bubble | DATA | 40.894.748 | 3.133.139 |
| Bubble | BIOMA | 48.047.538 | 14.816.409 |
| Bubble | MUNICIPIO | 53.842.337 | 26.703.314 |
| Insertion | DATA | 3.143.516 | 3.133.139 |
| Insertion | BIOMA | 14.826.785 | 14.816.409 |
| Insertion | MUNICIPIO | 26.713.688 | 26.703.314 |
| Selection | DATA | 53.846.253 | 8.691 |
| Selection | BIOMA | 53.846.253 | 10.353 |
| Selection | MUNICIPIO | 53.846.253 | 10.368 |
| Merge | DATA | 81.340 | 139.286 |
| Merge | BIOMA | 98.427 | 139.286 |
| Merge | MUNICIPIO | 121.834 | 139.286 |
| Quick | DATA | 194.733 | 41.583 |
| Quick | BIOMA | 195.790 | 46.818 |
| Quick | MUNICIPIO | 201.032 | 40.033 |
| Heap | DATA | 245.492 | 130.698 |
| Heap | BIOMA | 243.218 | 128.402 |
| Heap | MUNICIPIO | 244.384 | 128.464 |

Coisas para discutir na dissertação:
- Bubble e Insertion fazem **exatamente o mesmo número de trocas** em cada critério: os dois corrigem uma
  inversão por troca/deslocamento, então ambos fazem tantas quanto as inversões da entrada.
- O Selection faz o **máximo de comparações** (n(n-1)/2 = 53.846.253) sempre, mas é o que **menos troca**.
- O Merge faz o mesmo número de cópias em qualquer critério (depende só de n), mas o menor número de comparações.
- O Quick usa pivô por **mediana de três**; com pivô fixo no último elemento, ordenar por `DATA`
  (entrada quase ordenada) cairia no pior caso O(n²) e estouraria a pilha.

### Como adicionar um algoritmo novo

1. Crie `src/main/java/br/unip/aps/sort/NomeDoSort.java` implementando `AlgoritmoOrdenacao`
   (use o `BubbleSort.java` como modelo).
2. Em `AlgoritmosTest.java`, adicione um teste:
   ```java
   @Test
   void nomeDoSortOrdenaIgualAoJava() {
       verificaOrdenacao(new NomeDoSort());
   }
   ```
3. Rode os testes (botão ▶ ao lado da classe de teste). Só abra PR com o teste **verde**.

## 4. Fluxo de trabalho no Git

**Nunca faça commit direto na `main`.** Cada tarefa ganha uma branch própria.

```
git checkout main
git pull                              # pega o que os outros já fizeram
git checkout -b feat/merge-sort       # cria sua branch
# ... programa, testa ...
git add .
git commit -m "Implementa Merge Sort"
git push -u origin feat/merge-sort
```

Depois, no GitHub, abra um **Pull Request** para a `main` e peça para **outra pessoa do grupo revisar**.
Só faz merge depois da aprovação.

### Nomes de branch

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `feat/` | funcionalidade nova | `feat/quick-sort` |
| `fix/` | correção de bug | `fix/leitura-csv-acentos` |
| `docs/` | documentação | `docs/readme-endpoints` |

### Mensagens de commit

Em português, no imperativo, dizendo **o que** mudou: `Implementa Heap Sort`, `Corrige contagem de trocas no Quick Sort`.
Evite `ajustes`, `teste`, `asdf`.

## 5. Padrões de código

- Nomes em **português** (`FocoIncendio`, `ordenar`, `metricas`), igual ao resto do projeto.
- Encoding **UTF-8** (os CSVs têm acentos: "SÃO PAULO", "Mata Atlântica").
- Antes do commit, use **Ctrl+Alt+L** (formatar) e **Ctrl+Alt+O** (organizar imports) no IntelliJ.
- Não suba arquivos do IntelliJ (`.idea/`) nem a pasta `target/` — o `.gitignore` já cuida disso.

## 6. Divisão de tarefas

Marque seu nome antes de começar para ninguém fazer a mesma coisa duas vezes.

| Tarefa | Responsável | Status |
|---|---|---|
| `LeitorCsv` (leitura dos CSVs) | Marcelo | ✅ |
| Critérios `BIOMA` e `MUNICIPIO` | Marcelo | ✅ |
| Bubble Sort | Marcelo | ✅ |
| Insertion Sort | Marcelo | ✅ |
| Selection Sort | Marcelo | ✅ |
| Merge Sort | Marcelo | ✅ |
| Quick Sort | Marcelo | ✅ |
| Heap Sort | Marcelo | ✅ |
| `OrdenacaoService` | Marcelo | ✅ |
| `EstatisticaService` (extras) | Marcelo | ✅ |
| `ApiRoutes` + endpoint `/api/ordenar` | Marcelo | ✅ |
| Dashboard: tabela + métricas | | ⬜ |
| Dashboard: gráficos (Chart.js) | | ⬜ |
| Dashboard: mapa (Leaflet) | | ⬜ |
| Dissertação | todos | ⬜ |

Status: ⬜ não iniciado · 🟨 em andamento · ✅ concluído

## 7. Dúvidas

Antes de mudar algo que afeta todo mundo (a interface `AlgoritmoOrdenacao`, o `FocoIncendio`, o `pom.xml`),
avise no grupo — outras partes do código dependem disso.
