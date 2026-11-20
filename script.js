
/* ==================================================
   CONFIGURAÇÃO SUPABASE
================================================== */

const SUPABASE_URL = "https://tiqhpovsmieiztoqowfo.supabase.co";

const SUPABASE_KEY = "sb_publishable_zxeT6yaNuEi0iZuqMbH_yA_75L1NWJZ";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// IMPORTANTE: substituir pelo slug cadastrado para a Letícia
const CLIENTE_SLUG = "cliente-teste";

let clienteAtual = null;



/* ==================================================
   IDENTIFICAR CLIENTE
================================================== */

async function obterClienteDoSite() {

    if (clienteAtual) {
        return clienteAtual;
    }

    const { data, error } = await supabaseClient
        .rpc("obter_cliente_publico", {
            p_slug: CLIENTE_SLUG
        });

    if (error) {
        console.error("Erro ao identificar cliente:", error);
        return null;
    }

    if (!data || data.length === 0) {
        console.error("Cliente não encontrado.");
        return null;
    }

    clienteAtual = data[0];

    return clienteAtual;
}



/* ==================================================
   ELEMENTOS DO HTML
================================================== */

const selectServico = document.getElementById("servico");
const selectData = document.getElementById("data");
const selectHorario = document.getElementById("horario");

const containerServicos = document.getElementById("servicosCards");
const containerHorarios = document.getElementById("horariosDisponiveis");

const resumoServico = document.getElementById("resumoServico");
const resumoValor = document.getElementById("resumoValor");
const resumoData = document.getElementById("resumoData");
const resumoHorario = document.getElementById("resumoHorario");

const botaoAgendar = document.getElementById("btnAgendar");


/* ==================================================
   CALENDÁRIO VISUAL
================================================== */

let mesCalendarioVisivel = new Date();

mesCalendarioVisivel = new Date(
    mesCalendarioVisivel.getFullYear(),
    mesCalendarioVisivel.getMonth(),
    1
);

let datasDisponiveisCalendario = [];
let dataSelecionadaCalendario = "";


function obterDataAtualISO() {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


/* ==================================================
   DESENHAR CALENDÁRIO
================================================== */

function renderizarCalendarioDisponivel() {

    const elementoDias = document.getElementById("calendarioDias");
    const tituloMes = document.getElementById("mesAnoCalendario");

    if (!elementoDias || !tituloMes) return;

    const ano = mesCalendarioVisivel.getFullYear();
    const mes = mesCalendarioVisivel.getMonth();

    const nomeMes = new Date(ano, mes, 1)
        .toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });

    tituloMes.textContent =
        nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    elementoDias.innerHTML = "";

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

    // Espaços antes do primeiro dia
    for (let i = 0; i < primeiroDiaSemana; i++) {

        const vazio = document.createElement("span");

        vazio.className = "dia-vazio";

        elementoDias.appendChild(vazio);
    }

    // Dias do mês
    for (let dia = 1; dia <= quantidadeDias; dia++) {

        const dataISO = [
            ano,
            String(mes + 1).padStart(2, "0"),
            String(dia).padStart(2, "0")
        ].join("-");

        const estaDisponivel =
            datasDisponiveisCalendario.includes(dataISO);

        const estaSelecionado =
            dataSelecionadaCalendario === dataISO;

        const botao = document.createElement("button");

        botao.type = "button";
        botao.textContent = dia;
        botao.className = "dia-calendario";

        if (estaDisponivel) {

            botao.classList.add("disponivel");

            if (estaSelecionado) {
                botao.classList.add("selecionado");
            }

            botao.dataset.data = dataISO;

        } else {

            botao.disabled = true;
        }

        elementoDias.appendChild(botao);
    }

    // Impedir voltar para meses anteriores ao atual
    const botaoAnterior = document.getElementById("mesAnterior");

    const hoje = new Date();

    const primeiroMesAtual = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
    );

    if (botaoAnterior) {

        botaoAnterior.disabled =
            mesCalendarioVisivel <= primeiroMesAtual;
    }
}


/* ==================================================
   CARREGAR DATAS DISPONÍVEIS
================================================== */

async function carregarDatasDisponiveis() {

    const dataHoje = obterDataAtualISO();

    const cliente = await obterClienteDoSite();

    if (!cliente) {

        selectData.innerHTML =
            `<option value="">Cliente não identificado</option>`;

        datasDisponiveisCalendario = [];

        renderizarCalendarioDisponivel();

        return;
    }

    // Busca horários do cliente
    const { data: horarios, error } = await supabaseClient
        .from("horarios")
        .select("id, data")
        .eq("cliente_id", cliente.id)
        .gte("data", dataHoje)
        .order("data", { ascending: true });

    if (error) {

        console.error("Erro ao carregar horários:", error);

        selectData.innerHTML =
            `<option value="">Erro ao carregar datas</option>`;

        datasDisponiveisCalendario = [];

        renderizarCalendarioDisponivel();

        return;
    }

    if (!horarios || horarios.length === 0) {

        datasDisponiveisCalendario = [];

        selectData.innerHTML =
            `<option value="">Nenhuma data disponível</option>`;

        renderizarCalendarioDisponivel();

        return;
    }

    // IDs dos horários cadastrados
    const idsHorarios = horarios.map(item => item.id);

    // Busca horários reservados
    const { data: horariosReservados, error: erroReservados } =
        await supabaseClient
            .from("horarios_reservados")
            .select("horario_id")
            .in("horario_id", idsHorarios);

    if (erroReservados) {

        console.error("Erro ao verificar reservas:", erroReservados);

        selectData.innerHTML =
            `<option value="">Erro ao verificar disponibilidade</option>`;

        datasDisponiveisCalendario = [];

        renderizarCalendarioDisponivel();

        return;
    }
// IDs já reservados
const idsReservados = new Set(
    horariosReservados.map(item => item.horario_id)
);

// IMPORTANTE:
// Mostra todas as datas que possuem horários cadastrados,
// mesmo quando todos os horários já estão agendados.
datasDisponiveisCalendario = [
    ...new Set(horarios.map(item => item.data))
];
    // Atualiza o select original
    selectData.innerHTML =
        `<option value="">Selecione uma data</option>`;

    datasDisponiveisCalendario.forEach(dataDisponivel => {

        const [ano, mes, dia] = dataDisponivel.split("-");

        const opcao = document.createElement("option");

        opcao.value = dataDisponivel;
        opcao.textContent = `${dia}/${mes}/${ano}`;

        selectData.appendChild(opcao);
    });

    // Limpa seleção que deixou de estar disponível
    if (
        dataSelecionadaCalendario &&
        !datasDisponiveisCalendario.includes(dataSelecionadaCalendario)
    ) {

        dataSelecionadaCalendario = "";

        selectData.value = "";
    }

    renderizarCalendarioDisponivel();
}


/* ==================================================
   NAVEGAÇÃO DO CALENDÁRIO
================================================== */

document.getElementById("mesAnterior").addEventListener("click", () => {

    mesCalendarioVisivel.setMonth(
        mesCalendarioVisivel.getMonth() - 1
    );

    renderizarCalendarioDisponivel();
});


document.getElementById("proximoMes").addEventListener("click", () => {

    mesCalendarioVisivel.setMonth(
        mesCalendarioVisivel.getMonth() + 1
    );

    renderizarCalendarioDisponivel();
});


/* ==================================================
   SELECIONAR DATA NO CALENDÁRIO
================================================== */

document.getElementById("calendarioDias").addEventListener("click", event => {

    const botao = event.target.closest(".dia-calendario.disponivel");

    if (!botao) return;

    const dataSelecionada = botao.dataset.data;

    if (!datasDisponiveisCalendario.includes(dataSelecionada)) {
        return;
    }

    dataSelecionadaCalendario = dataSelecionada;

    selectData.value = dataSelecionada;

    renderizarCalendarioDisponivel();

    selectData.dispatchEvent(new Event("change"));
});


/* ==================================================
   ATUALIZAR DATA NO RESUMO
================================================== */

selectData.addEventListener("change", function () {

    if (!this.value) {

        resumoData.textContent = "Selecione uma data";

        dataSelecionadaCalendario = "";

        renderizarCalendarioDisponivel();

        return;
    }

    dataSelecionadaCalendario = this.value;

    const dataFormatada = this.value
        .split("-")
        .reverse()
        .join("/");

    resumoData.textContent = dataFormatada;

    renderizarCalendarioDisponivel();
});


/* ==================================================
   CARREGAR HORÁRIOS DISPONÍVEIS
================================================== */

selectData.addEventListener("change", async () => {

    const dataSelecionada = selectData.value;

    selectHorario.innerHTML =
        `<option value="">Selecione um horário</option>`;

    selectHorario.disabled = true;

    resumoHorario.textContent = "Selecione um horário";

    containerHorarios.innerHTML = `
        <p class="mensagem-horarios">
            Carregando horários...
        </p>
    `;

    if (!dataSelecionada) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Selecione uma data para visualizar os horários.
            </p>
        `;

        return;
    }

    const cliente = await obterClienteDoSite();

    if (!cliente) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Não foi possível identificar o cliente.
            </p>
        `;

        return;
    }

    // Busca horários do cliente e da data escolhida
    const { data: horarios, error } = await supabaseClient
        .from("horarios")
        .select("id, horario")
        .eq("cliente_id", cliente.id)
        .eq("data", dataSelecionada)
        .order("horario", { ascending: true });

    if (error) {

        console.error("Erro ao carregar horários:", error);

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Erro ao carregar os horários.
            </p>
        `;

        return;
    }

    if (!horarios || horarios.length === 0) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Nenhum horário cadastrado para esta data.
            </p>
        `;

        return;
    }

    // Busca horários reservados
    const idsHorarios = horarios.map(item => item.id);

    const { data: horariosReservados, error: erroReservados } =
        await supabaseClient
            .from("horarios_reservados")
            .select("horario_id")
            .in("horario_id", idsHorarios);

    if (erroReservados) {

        console.error("Erro ao verificar reservas:", erroReservados);

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Não foi possível verificar a disponibilidade.
            </p>
        `;

        return;
    }

    const idsReservados = new Set(
        horariosReservados.map(item => item.horario_id)
    );

    containerHorarios.innerHTML = "";

    selectHorario.innerHTML =
        `<option value="">Selecione um horário</option>`;

    // Exibe todos os horários
    horarios.forEach(item => {

        const horarioFormatado = item.horario.substring(0, 5);

        const estaReservado = idsReservados.has(item.id);

        const botao = document.createElement("button");

        botao.type = "button";

        botao.className = estaReservado
            ? "horario-card agendado"
            : "horario-card";

        botao.textContent = estaReservado
            ? `${horarioFormatado} — Agendado`
            : horarioFormatado;

        botao.dataset.horarioId = item.id;

        if (estaReservado) {

            botao.disabled = true;

        } else {

            const opcao = document.createElement("option");

            opcao.value = item.id;
            opcao.textContent = horarioFormatado;
            opcao.dataset.horario = horarioFormatado;

            selectHorario.appendChild(opcao);
        }

        containerHorarios.appendChild(botao);
    });

    const existeHorarioLivre = horarios.some(
        item => !idsReservados.has(item.id)
    );

    if (!existeHorarioLivre) {

        const mensagem = document.createElement("p");

        mensagem.className = "mensagem-horarios";

        mensagem.textContent =
            "Todos os horários desta data já estão agendados.";

        containerHorarios.appendChild(mensagem);
    }

    selectHorario.disabled = !existeHorarioLivre;
});


/* ==================================================
   SELECIONAR HORÁRIO VISUALMENTE
================================================== */

containerHorarios.addEventListener("click", event => {

    const botao = event.target.closest(".horario-card");

    if (!botao || botao.disabled) return;

    selectHorario.value = botao.dataset.horarioId;

    if (!selectHorario.value) return;

    containerHorarios
        .querySelectorAll(".horario-card")
        .forEach(item => {
            item.classList.remove("selecionado");
        });

    botao.classList.add("selecionado");

    selectHorario.dispatchEvent(new Event("change"));
});


/* ==================================================
   ATUALIZAR HORÁRIO NO RESUMO
================================================== */

selectHorario.addEventListener("change", () => {

    const opcaoSelecionada =
        selectHorario.options[selectHorario.selectedIndex];

    if (!selectHorario.value) {

        resumoHorario.textContent = "Selecione um horário";

        return;
    }

    resumoHorario.textContent =
        opcaoSelecionada.dataset.horario;
});


/* ==================================================
   SELEÇÃO VISUAL DOS SERVIÇOS
================================================== */

function atualizarResumoServico() {

    const opcaoSelecionada =
        selectServico.options[selectServico.selectedIndex];

    if (!selectServico.value) {

        resumoServico.textContent = "Nenhum serviço selecionado";

        resumoValor.textContent = "R$ 0,00";

        return;
    }

    const valor = Number(opcaoSelecionada.dataset.valor);

    resumoServico.textContent = opcaoSelecionada.text.trim();

    resumoValor.textContent = valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


function atualizarCardSelecionado() {

    containerServicos
        .querySelectorAll(".servico-card")
        .forEach(card => {

            card.classList.toggle(
                "selecionado",
                card.dataset.servico === selectServico.value
            );
        });
}


// Clique nos cards
containerServicos.addEventListener("click", event => {

    const card = event.target.closest(".servico-card");

    if (!card) return;

    const nomeServico = card.dataset.servico;

    const opcao = Array.from(selectServico.options).find(
        item => item.value === nomeServico
    );

    if (!opcao) {

        console.error("Serviço não encontrado:", nomeServico);

        return;
    }

    selectServico.value = nomeServico;

    atualizarCardSelecionado();

    atualizarResumoServico();
});


// Caso o select seja alterado por outro código
selectServico.addEventListener("change", () => {

    atualizarCardSelecionado();

    atualizarResumoServico();
});


/* ==================================================
   CONFIRMAR AGENDAMENTO
================================================== */

botaoAgendar.addEventListener("click", async function () {

    const servico = selectServico.value;

    const opcaoServico =
        selectServico.options[selectServico.selectedIndex];

    const valorServico = Number(opcaoServico.dataset.valor);

    const data = selectData.value;

    const horarioId = selectHorario.value;

    const opcaoHorario =
        selectHorario.options[selectHorario.selectedIndex];

    const horario = opcaoHorario?.dataset.horario || "";

    const nome = document.getElementById("nome").value.trim();

    const whatsappCliente =
        document.getElementById("whatsapp").value.trim();

    // Verifica os campos
    if (
        servico === "" ||
        data === "" ||
        horarioId === "" ||
        nome === "" ||
        whatsappCliente === ""
    ) {

        alert("Por favor, preencha todos os campos.");

        return;
    }

    if (!clienteAtual) {

        alert("Não foi possível identificar o Studio.");

        return;
    }

    // Valida WhatsApp
    const whatsappNumeros = whatsappCliente.replace(/\D/g, "");

    if (whatsappNumeros.length !== 11) {

        alert(
            "Digite seu WhatsApp com DDD.\nExemplo: (99) 99999-9999"
        );

        return;
    }

    const dataFormatada = data
        .split("-")
        .reverse()
        .join("/");

    const nomeServico = opcaoServico.text.trim();

    // Evita duplo clique
    botaoAgendar.disabled = true;

    botaoAgendar.textContent = "Confirmando...";

    try {

        // Salva a reserva no Supabase
        const { error: erroReserva } = await supabaseClient
            .from("reservas")
            .insert([
                {
                    horario_id: Number(horarioId),
                    cliente_id: clienteAtual.id,
                    nome: nome,
                    whatsapp: whatsappNumeros,
                    servico: nomeServico,
                    valor_servico: valorServico,
                    status: "reservado"
                }
            ]);

        if (erroReserva) {

            console.error("Erro ao realizar reserva:", erroReserva);

            if (erroReserva.code === "23505") {

                alert(
                    "Este horário acabou de ser reservado por outra cliente. Escolha outro horário."
                );

            } else {

                alert(
                    "Não foi possível realizar o agendamento. Tente novamente."
                );
            }

            await carregarDatasDisponiveis();

            return;
        }

        // Número do Studio
        let numeroEmpresa = clienteAtual.whatsapp.replace(/\D/g, "");

        if (!numeroEmpresa.startsWith("55")) {
            numeroEmpresa = "55" + numeroEmpresa;
        }

        // Mensagem para o WhatsApp
        const mensagem = `
*NOVO AGENDAMENTO*

*Nome:* ${nome}
*Serviço:* ${nomeServico}
*Data:* ${dataFormatada}
*Horário:* ${horario}
*WhatsApp da cliente:* ${whatsappCliente}

Gostaria de confirmar este horário.
`;

        const mensagemCodificada = encodeURIComponent(mensagem);

        const linkWhatsApp =
            `https://wa.me/${numeroEmpresa}?text=${mensagemCodificada}`;

        // Atualiza a disponibilidade
        alert("Agendamento registrado com sucesso!");

        // Abre o WhatsApp
        window.open(linkWhatsApp, "_blank");

        // Atualiza calendário e horários
        await carregarDatasDisponiveis();

        selectData.dispatchEvent(new Event("change"));

        // Limpa seleção do horário
        selectHorario.value = "";

        resumoHorario.textContent = "Selecione um horário";

        // Limpa dados da cliente
        document.getElementById("nome").value = "";

        document.getElementById("whatsapp").value = "";

    } catch (erro) {

        console.error("Erro inesperado:", erro);

        alert("Ocorreu um erro inesperado. Tente novamente.");

    } finally {

        botaoAgendar.disabled = false;

        botaoAgendar.textContent = "Confirmar agendamento";
    }
});


/* ==================================================
   INICIALIZAÇÃO
================================================== */

async function iniciarAgendamento() {

    renderizarCalendarioDisponivel();

    await carregarDatasDisponiveis();

    atualizarResumoServico();

    atualizarResumoCard();

    console.log("Sistema de agendamento inicializado.");
}

function atualizarResumoCard() {
    atualizarCardSelecionado();
}

iniciarAgendamento();
