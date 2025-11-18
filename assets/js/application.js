// Variável global para armazenar o token de sessão
let sessionToken = null;

// --- Constantes de Elementos do DOM ---
const views = {
    generate: document.getElementById('viewGenerateQuestions'),
    welcome: document.getElementById('viewWelcome')
};
const loadingSpinner = document.getElementById('loadingSpinnerContainer');
const alertContainer = document.getElementById('alertContainer');
const generateForm = document.getElementById('generateForm');
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn'); // Botão de recolher
const themeToggler = document.getElementById('theme-toggler');
const activeDbBadge = document.getElementById('activeDbBadge');
const activeDbNameSpan = document.getElementById('activeDbName');
const dashboardActiveDbBadge = document.getElementById('dashboardActiveDbBadge');
const dashboardActiveDbName = document.getElementById('dashboardActiveDbName');
const settingsModalEl = document.getElementById('settingsModal');
const rootFolderIdInput = document.getElementById('rootFolderId');
const saveRootFolderButton = document.getElementById('saveRootFolderButton');
const activeConfigSelect = document.getElementById('activeConfigSelect');
const newConfigNameInput = document.getElementById('newConfigName');
const createNewConfigButton = document.getElementById('createNewConfigButton');
const questionBankModalEl = document.getElementById('questionBankSummaryModal');
const editQuestionModalEl = document.getElementById('editQuestionModal');
const saveQuestionChangesButton = document.getElementById('saveQuestionChangesButton');
const exportGiftModalEl = document.getElementById('exportGiftModal');
const exportGiftSubjectSelect = document.getElementById('exportGiftSubjectSelect');
const confirmExportGiftButton = document.getElementById('confirmExportGiftButton');
const exportXmlModalEl = document.getElementById('exportXmlModal');
const exportXmlSubjectSelect = document.getElementById('exportXmlSubjectSelect');
const confirmExportXmlButton = document.getElementById('confirmExportXmlButton');
const exportDocModalEl = document.getElementById('exportDocModal');
const exportDocSubjectSelect = document.getElementById('exportDocSubjectSelect');
const targetDocIdInput = document.getElementById('targetDocId');
const confirmExportDocButton = document.getElementById('confirmExportDocButton');

let editQuestionModalInstance = null;

// --- Função de Login ---
function handleLogin() {
    showLoading(true);
    const username = document.getElementById('username').value;
    const key = document.getElementById('clientKey').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';

    google.script.run.withSuccessHandler(response => {
        showLoading(false);
        if (response.success && response.token) {
            sessionToken = response.token; // Armazena o token na variável global
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('main-application').style.display = 'flex';
            loadInitialSettings();
            setActiveView('welcome');
        } else {
            errorDiv.textContent = response.message || "Usuário ou chave inválida.";
            errorDiv.style.display = 'block';
        }
    }).withFailureHandler(handleError).authenticate(username, key);
}

// --- Gerenciamento de Configurações ---
function loadInitialSettings() {
    const savedRootFolderId = localStorage.getItem('questGenRootFolderId');
    if (savedRootFolderId) {
        rootFolderIdInput.value = savedRootFolderId;
        google.script.run.withSuccessHandler(populateConfigSelect).withFailureHandler(handleError).setRootFolder(sessionToken, savedRootFolderId);
    }
    checkServerApiKey();
}

function saveRootFolder() {
    if (!sessionToken) return showAlert('Erro de sessão. Por favor, recarregue a página.', 'danger');
    const folderId = rootFolderIdInput.value.trim();
    if (!folderId) return showAlert('Por favor, informe o ID da Pasta Raiz.', 'warning');
    showLoading(true);
    google.script.run.withSuccessHandler(response => {
        showLoading(false);
        if (response.success) {
            localStorage.setItem('questGenRootFolderId', folderId);
            showAlert('Pasta Raiz definida e configurações carregadas!', 'success');
            populateConfigSelect(response);
        } else {
            showAlert(response.message, 'danger');
        }
    }).withFailureHandler(handleError).setRootFolder(sessionToken, folderId);
}

function createNewConfig() {
    if (!sessionToken) return showAlert('Erro de sessão. Por favor, recarregue a página.', 'danger');
    const newName = newConfigNameInput.value.trim();
    if (!newName) return showAlert('Por favor, dê um nome ao novo banco de questões.', 'warning');
    showLoading(true);
    google.script.run.withSuccessHandler(response => {
        showLoading(false);
        if (response && response.success) {
            showAlert(`Banco de Questões "${newName}" criado com sucesso!`, 'success');
            newConfigNameInput.value = '';
            populateConfigSelect(response);
        } else {
            showAlert(response ? response.message : "Erro inesperado.", 'danger');
        }
    }).withFailureHandler(handleError).createNewConfig(sessionToken, newName);
}

function populateConfigSelect(response) {
    if (!response) {
        handleError({ message: "Resposta inválida do servidor." });
        activeConfigSelect.innerHTML = `<option disabled selected>Erro ao carregar</option>`;
        return;
    }
    if (response.success && response.configs) {
        activeConfigSelect.innerHTML = '';
        if (response.configs.length === 0) {
            activeConfigSelect.innerHTML = '<option disabled selected>Nenhum banco criado.</option>';
        } else {
            response.configs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.config_id;
                option.textContent = config.config_name;
                activeConfigSelect.appendChild(option);
            });
            const lastActiveConfig = localStorage.getItem('questGenActiveConfigId');
            if (lastActiveConfig && activeConfigSelect.querySelector(`option[value="${lastActiveConfig}"]`)) {
                activeConfigSelect.value = lastActiveConfig;
            }
        }
    } else {
        activeConfigSelect.innerHTML = `<option disabled selected>Erro: ${response.message || 'Falha'}</option>`;
    }
    updateActiveDbDisplay();
    if (views.welcome.classList.contains('active')) {
        loadDashboardData();
    }
}

function getActiveConfigId() {
    const activeId = activeConfigSelect.value;
    if (!activeId || activeConfigSelect.disabled || (activeConfigSelect.options.length > 0 && activeConfigSelect.options[0].disabled)) {
        showAlert('Selecione ou crie um Banco de Questões nas Configurações.', 'warning');
        const settingsModalInstance = bootstrap.Modal.getInstance(settingsModalEl) || new bootstrap.Modal(settingsModalEl);
        settingsModalInstance.show();
        return null;
    }
    return activeId;
}

// --- Funções Auxiliares e de UI ---
function updateActiveDbDisplay() {
    const selectedOption = activeConfigSelect.options[activeConfigSelect.selectedIndex];
    if (selectedOption && !selectedOption.disabled) {
        const dbName = selectedOption.textContent;
        activeDbNameSpan.textContent = dbName;
        dashboardActiveDbName.textContent = dbName;
        activeDbBadge.style.display = 'inline-block';
        dashboardActiveDbBadge.style.display = 'inline-block';
    } else {
        activeDbBadge.style.display = 'none';
        dashboardActiveDbBadge.style.display = 'none';
    }
}

function setActiveView(viewName) {
    Object.values(views).forEach(view => view.classList.remove('active'));
    if (views[viewName]) views[viewName].classList.add('active');
    document.querySelectorAll('.sidebar .nav-link[data-view]').forEach(link => link.classList.remove('active'));
    const activeNavLink = document.querySelector(`.sidebar .nav-link[data-view="${viewName}"]`);
    if (activeNavLink) activeNavLink.classList.add('active');
    if (window.innerWidth < 992 && sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
        sidebarOverlay.style.display = 'none';
    }
    if (viewName === 'welcome') loadDashboardData();
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type = 'info') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert"><div>${message}</div><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
    alertContainer.innerHTML = '';
    alertContainer.append(wrapper);
}

function handleError(error) {
    showLoading(false);
    showAlert(`Ocorreu um erro: ${error.message || error}`, 'danger');
    console.error("Apps Script Error:", error);
}

function checkServerApiKey(showSuccessMessage = false) {
    google.script.run.withSuccessHandler(response => {
        if (!response.isConfigured) {
            showAlert(response.message, 'danger');
        } else if (showSuccessMessage) {
            showAlert('Chave API Gemini está configurada.', 'info');
        }
    }).withFailureHandler(handleError).checkApiKeyConfig();
}

function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function populateSubjectSelect(selectElementId) {
    const configId = getActiveConfigId();
    if (!configId) return;
    const selectEl = document.getElementById(selectElementId);
    selectEl.innerHTML = '<option value="ALL_SUBJECTS">Todas as Disciplinas</option>';
    google.script.run.withSuccessHandler(response => {
        if (response.success && response.summary) {
            for (const subject in response.summary) {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = `${subject} (${response.summary[subject]}q)`;
                selectEl.appendChild(option);
            }
        } else {
            selectEl.innerHTML = `<option value="" disabled>${response.message || 'Erro'}</option>`;
        }
    }).withFailureHandler(handleError).getQuestionBankSummary(sessionToken, configId);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('loginButton').addEventListener('click', handleLogin);
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        sidebarOverlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('show');
        sidebarOverlay.style.display = 'none';
    });
    if (sidebarCollapseBtn) { // Para desktop
        sidebarCollapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    // --- Lógica do Seletor de Tema ---
    const themeIcon = themeToggler.querySelector('i');

    // Função para aplicar o tema salvo
    const applySavedTheme = () => {
        const savedTheme = localStorage.getItem('questGenTheme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
        } else {
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
        }
    };

    // Adiciona o listener para o clique no botão
    themeToggler.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('questGenTheme', 'light');
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('questGenTheme', 'dark');
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
        }
    });

    // Aplica o tema salvo ao carregar a página
    applySavedTheme();
    // --- Fim da Lógica do Seletor de Tema ---
    document.querySelectorAll('.sidebar .nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveView(link.getAttribute('data-view'));
        });
    });
    saveRootFolderButton.addEventListener('click', saveRootFolder);
    createNewConfigButton.addEventListener('click', createNewConfig);
    activeConfigSelect.addEventListener('change', () => {
        localStorage.setItem('questGenActiveConfigId', activeConfigSelect.value);
        showAlert('Banco de questões ativo alterado.', 'info');
        updateActiveDbDisplay();
        if (views.welcome.classList.contains('active')) {
            loadDashboardData();
        }
    });


    generateForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const configId = getActiveConfigId();
        if (!configId) return;
        const subjectName = document.getElementById('subjectName').value;
        const docId = document.getElementById('docId').value;
        const numQuestions = parseInt(document.getElementById('numQuestions').value);
        if (!subjectName || !docId || !numQuestions) return showAlert('Preencha todos os campos.', 'warning');
        showLoading(true);
        google.script.run.withSuccessHandler(r => {
            showLoading(false);
            showAlert(r.message, r.success ? 'success' : 'danger');
            if (r.success) generateForm.reset();
        }).withFailureHandler(handleError).processDocumentAndGenerateQuestions(sessionToken, configId, docId, subjectName, numQuestions);
    });
    exportGiftModalEl.addEventListener('show.bs.modal', () => populateSubjectSelect('exportGiftSubjectSelect'));
    exportXmlModalEl.addEventListener('show.bs.modal', () => populateSubjectSelect('exportXmlSubjectSelect'));
    exportDocModalEl.addEventListener('show.bs.modal', () => {
        populateSubjectSelect('exportDocSubjectSelect');
        targetDocIdInput.value = '';
    });
    questionBankModalEl.addEventListener('show.bs.modal', () => {
        const configId = getActiveConfigId();
        if (!configId) return;
        const summaryBody = document.getElementById('questionBankSummaryBody');
        summaryBody.innerHTML = '<p>Carregando...</p>';
        google.script.run.withSuccessHandler(response => {
            if (response.success && response.summary) {
                if (Object.keys(response.summary).length === 0) {
                    summaryBody.innerHTML = '<p class="text-center">Nenhuma questão encontrada.</p>';
                    return;
                }
                let html = '<ul class="list-group">';
                for (const subject in response.summary) {
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center"><a href="#" class="text-decoration-none subject-link" data-subject="${subject}">${subject}</a><span class="badge bg-primary rounded-pill">${response.summary[subject]}</span></li>`;
                }
                html += '</ul>';
                summaryBody.innerHTML = html;
                summaryBody.querySelectorAll('.subject-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        openDisciplineQuestionsModal(link.dataset.subject, configId);
                    });
                });
            } else {
                summaryBody.innerHTML = `<p class="text-danger">${response.message}</p>`;
            }
        }).withFailureHandler(handleError).getQuestionBankSummary(sessionToken, configId);
    });
    confirmExportGiftButton.addEventListener('click', () => {
        const configId = getActiveConfigId();
        if (!configId) return;
        showLoading(true);
        google.script.run.withSuccessHandler(r => {
            showLoading(false);
            if (r.success) {
                downloadFile('export.txt', r.giftData);
                showAlert('Exportado com sucesso!', 'success');
            } else showAlert(r.message, 'danger');
        }).withFailureHandler(handleError).exportToMoodleGift(sessionToken, configId, exportGiftSubjectSelect.value);
    });
    confirmExportXmlButton.addEventListener('click', () => {
        const configId = getActiveConfigId();
        if (!configId) return;
        showLoading(true);
        google.script.run.withSuccessHandler(r => {
            showLoading(false);
            if (r.success) {
                downloadFile('export.xml', r.xmlData, 'application/xml;charset=utf-8');
                showAlert('Exportado com sucesso!', 'success');
            } else showAlert(r.message, 'danger');
        }).withFailureHandler(handleError).exportToMoodleXML(sessionToken, configId, exportXmlSubjectSelect.value);
    });
    confirmExportDocButton.addEventListener('click', () => {
        const configId = getActiveConfigId();
        const docId = targetDocIdInput.value.trim();
        if (!configId || !docId) return showAlert('ID do Documento é obrigatório.', 'warning');
        showLoading(true);
        google.script.run.withSuccessHandler(r => {
            showLoading(false);
            showAlert(r.message, r.success ? 'success' : 'danger');
        }).withFailureHandler(handleError).exportQuestionsToGoogleDoc(sessionToken, configId, docId, exportDocSubjectSelect.value);
    });
    document.getElementById('navClearSheet').addEventListener('click', (event) => {
        event.preventDefault();
        const configId = getActiveConfigId();
        if (!configId) return;
        if (confirm('Tem certeza que deseja limpar TODAS as questões deste banco?')) {
            showLoading(true);
            google.script.run.withSuccessHandler(r => {
                showLoading(false);
                showAlert(r.message, r.success ? 'success' : 'warning');
            }).withFailureHandler(handleError).clearSheetData(sessionToken, configId);
        }
    });
    saveQuestionChangesButton.addEventListener('click', handleUpdateQuestionSubmit);
});

// --- Funções de Ações (Banco de Questões, Edição, Exclusão) ---
function openDisciplineQuestionsModal(subjectName, configId) {
    const modalBody = document.getElementById('disciplineQuestionsModalBody');
    const modalTitle = document.getElementById('disciplineQuestionsModalTitle');
    modalTitle.innerHTML = `<i class="bi bi-card-list"></i> Questões de: ${subjectName}`;
    modalBody.innerHTML = '<p>Carregando...</p>';
    const disciplineModalInstance = new bootstrap.Modal(document.getElementById('disciplineQuestionsModal'));
    disciplineModalInstance.show();
    google.script.run.withSuccessHandler(response => {
        if (response.success && response.questions) {
            if (response.questions.length === 0) {
                modalBody.innerHTML = '<p>Nenhuma questão encontrada.</p>';
                return;
            }
            let tableHtml = `<div class="table-responsive"><table class="table table-striped table-hover"><thead><tr><th>Código</th><th>Enunciado</th><th>Gabarito</th><th>Ações</th></tr></thead><tbody>`;
            response.questions.forEach(q => {
                const questionData = encodeURIComponent(JSON.stringify(q));
                tableHtml += `<tr data-question-code="${q.code}"><td>${q.code}</td><td style="white-space: pre-wrap;">${q.statement}</td><td><strong>${q.answer_key}</strong></td><td><button class="btn btn-sm btn-primary edit-btn" data-question='${questionData}'><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-danger delete-btn" data-code="${q.code}"><i class="bi bi-trash"></i></button></td></tr>`;
            });
            tableHtml += '</tbody></table></div>';
            modalBody.innerHTML = tableHtml;
            addEventListenersToAdminButtons();
        } else {
            modalBody.innerHTML = `<p class="text-danger">${response.message}</p>`;
        }
    }).withFailureHandler(handleError).getQuestionsBySubject(sessionToken, configId, subjectName);
}

function addEventListenersToAdminButtons() {
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditQuestionClick));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteQuestionClick));
}

function handleDeleteQuestionClick(event) {
    const questionCode = event.currentTarget.dataset.code;
    if (confirm(`Excluir questão ${questionCode}?`)) {
        const configId = getActiveConfigId();
        if (!configId) return;
        showLoading(true);
        google.script.run.withSuccessHandler(r => {
            showLoading(false);
            showAlert(r.message, r.success ? 'success' : 'danger');
            if (r.success) document.querySelector(`tr[data-question-code="${questionCode}"]`).remove();
        }).withFailureHandler(handleError).deleteQuestion(sessionToken, configId, questionCode);
    }
}

function handleEditQuestionClick(event) {
    const question = JSON.parse(decodeURIComponent(event.currentTarget.dataset.question));
    document.getElementById('editQuestionCode').value = question.code;
    document.getElementById('editQuestionSubject').value = question.subject;
    document.getElementById('editStatement').value = question.statement || '';
    document.getElementById('editOptionA').value = question.option_a || '';
    document.getElementById('editOptionB').value = question.option_b || '';
    document.getElementById('editOptionC').value = question.option_c || '';
    document.getElementById('editOptionD').value = question.option_d || '';
    document.getElementById('editOptionE').value = question.option_e || '';
    document.getElementById('editAnswerKey').value = question.answer_key || '';
    document.getElementById('editComment').value = question.comment || '';
    editQuestionModalInstance = new bootstrap.Modal(editQuestionModalEl);
    editQuestionModalInstance.show();
}

function handleUpdateQuestionSubmit() {
    const configId = getActiveConfigId();
    if (!configId) return;
    const questionData = {
        code: document.getElementById('editQuestionCode').value,
        subject: document.getElementById('editQuestionSubject').value,
        statement: document.getElementById('editStatement').value,
        option_a: document.getElementById('editOptionA').value,
        option_b: document.getElementById('editOptionB').value,
        option_c: document.getElementById('editOptionC').value,
        option_d: document.getElementById('editOptionD').value,
        option_e: document.getElementById('editOptionE').value,
        answer_key: document.getElementById('editAnswerKey').value.toUpperCase(),
        comment: document.getElementById('editComment').value
    };
    showLoading(true);
    google.script.run.withSuccessHandler(r => {
        showLoading(false);
        showAlert(r.message, r.success ? 'success' : 'danger');
        if (r.success) {
            editQuestionModalInstance.hide();
            const row = document.querySelector(`tr[data-question-code="${questionData.code}"]`);
            if (row) {
                row.cells[1].textContent = questionData.statement;
                row.cells[2].querySelector('strong').textContent = questionData.answer_key;
                row.querySelector('.edit-btn').dataset.question = encodeURIComponent(JSON.stringify(questionData));
            }
        }
    }).withFailureHandler(handleError).updateQuestion(sessionToken, configId, questionData);
}

// --- Dashboard ---
function loadDashboardData() {
    const configId = getActiveConfigId();
    const loadingDiv = document.getElementById('dashboardLoading');
    const contentDivs = document.querySelectorAll('#dashboardContent [data-stat]');
    if (!configId) {
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<p class="text-muted">Selecione um banco de questões para ver o dashboard.</p>';
        contentDivs.forEach(el => el.style.display = 'none');
        return;
    }
    loadingDiv.style.display = 'block';
    loadingDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div><p class="mt-2">Carregando...</p>';
    contentDivs.forEach(el => el.style.display = 'none');
    updateActiveDbDisplay();
    google.script.run.withSuccessHandler(response => {
        loadingDiv.style.display = 'none';
        if (response.success) {
            const { stats } = response;
            document.getElementById('statTotalQuestions').textContent = stats.totalQuestions;
            document.getElementById('statSubjectCount').textContent = stats.subjectCount;
            const subjectList = document.getElementById('statSubjectList');
            subjectList.innerHTML = '';
            if (stats.subjectCount > 0) {
                for (const subject in stats.subjects) {
                    subjectList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">${subject} <span class="badge bg-primary rounded-pill">${stats.subjects[subject]}</span></li>`;
                }
            } else {
                subjectList.innerHTML = '<li class="list-group-item">Nenhuma questão cadastrada.</li>';
            }
            contentDivs.forEach(el => el.style.display = 'block');
        } else {
            loadingDiv.style.display = 'block';
            loadingDiv.innerHTML = `<p class="text-danger">Erro: ${response.message}</p>`;
        }
    }).withFailureHandler(handleError).getDashboardStats(sessionToken, configId);
}