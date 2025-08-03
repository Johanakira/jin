// public/client.js

// --- DOM Elements ---
const sections = {
    jobs: document.getElementById('jobs-section'),
    clients: document.getElementById('clients-section'),
    addJob: document.getElementById('add-job-section'),
    addClient: document.getElementById('add-client-section')
};

const navButtons = {
    showJobs: document.getElementById('show-jobs-btn'),
    showClients: document.getElementById('show-clients-btn'),
    showAddJob: document.getElementById('show-add-job-btn'),
    showAddClient: document.getElementById('show-add-client-btn')
};

const jobsList = document.getElementById('jobs-list');
const clientsList = document.getElementById('clients-list');
const addJobForm = document.getElementById('add-job-form');
const addClientForm = document.getElementById('add-client-form');
const jobClientSelect = document.getElementById('job-client'); // For add job form
const editJobClientSelect = document.getElementById('edit-job-client'); // For edit job modal
const jobStatusFilter = document.getElementById('job-status-filter');

const editJobModal = document.getElementById('edit-job-modal');
const editJobForm = document.getElementById('edit-job-form');
const editClientModal = document.getElementById('edit-client-modal');
const editClientForm = document.getElementById('edit-client-form');

const statusMessageDiv = document.getElementById('status-message');

// --- IndexedDB Setup ---
let db;
const DB_NAME = 'paulsCleaningCrewDB';
const DB_VERSION = 1;
const OBJECT_STORES = {
    jobs: 'jobs',
    clients: 'clients'
};

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(OBJECT_STORES.jobs)) {
                db.createObjectStore(OBJECT_STORES.jobs, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(OBJECT_STORES.clients)) {
                db.createObjectStore(OBJECT_STORES.clients, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

async function storeDataInIndexedDB(storeName, data) {
    if (!db) await openIndexedDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    data.forEach(item => store.put(item)); // Use put to update or add
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
}

async function getDataFromIndexedDB(storeName) {
    if (!db) await openIndexedDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// --- Utility Functions ---

function showSection(sectionId) {
    Object.values(sections).forEach(section => {
        section.classList.remove('active');
    });
    sections[sectionId].classList.add('active');
}

function showStatusMessage(message, isError = false) {
    statusMessageDiv.textContent = message;
    statusMessageDiv.style.backgroundColor = isError ? '#F44336' : '#333';
    statusMessageDiv.classList.add('show');
    setTimeout(() => {
        statusMessageDiv.classList.remove('show');
    }, 3000);
}

async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showStatusMessage(`Error: ${error.message}`, true);
        throw error; // Re-throw to allow calling functions to handle
    }
}

// --- Client Management ---

async function loadClients(selectElement = null) {
    clientsList.innerHTML = '<p class="loading-message">Loading clients...</p>';
    if (selectElement) {
        selectElement.innerHTML = '<option value="">Loading clients...</option>';
    }

    let clients = [];
    if (navigator.onLine) {
        try {
            clients = await fetchData('/api/clients');
            await storeDataInIndexedDB(OBJECT_STORES.clients, clients); // Cache data
        } catch (error) {
            console.warn('Could not fetch clients from network, trying IndexedDB.', error);
            clients = await getDataFromIndexedDB(OBJECT_STORES.clients);
            showStatusMessage('Offline: Displaying cached clients.', false);
        }
    } else {
        clients = await getDataFromIndexedDB(OBJECT_STORES.clients);
        showStatusMessage('Offline: Displaying cached clients.', false);
    }

    displayClients(clients);
    if (selectElement) {
        populateClientSelect(selectElement, clients);
    }
}

function displayClients(clients) {
    clientsList.innerHTML = '';
    if (clients.length === 0) {
        clientsList.innerHTML = '<p>No clients found. Add a new client!</p>';
        return;
    }
    clients.forEach(client => {
        const clientDiv = document.createElement('div');
        clientDiv.classList.add('data-item');
        clientDiv.innerHTML = `
            <h3>${client.name}</h3>
            <p><strong>Phone:</strong> ${client.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
            <p><strong>Address:</strong> ${client.address || 'N/A'}</p>
            <div class="actions">
                <button class="edit-btn" data-id="${client.id}">Edit</button>
                <button class="delete-btn" data-id="${client.id}">Delete</button>
            </div>
        `;
        clientsList.appendChild(clientDiv);
    });
}

function populateClientSelect(selectElement, clients) {
    selectElement.innerHTML = '<option value="">-- Select Client --</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        selectElement.appendChild(option);
    });
}

async function addClient(event) {
    event.preventDefault();
    const formData = new FormData(addClientForm);
    const clientData = Object.fromEntries(formData.entries());

    try {
        const newClient = await fetchData('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        showStatusMessage('Client added successfully!');
        addClientForm.reset();
        loadClients(jobClientSelect); // Reload clients for display and job form
        showSection('clients'); // Show clients list after adding
    } catch (error) {
        // Error message already shown by fetchData
    }
}

async function editClient(event) {
    event.preventDefault();
    const clientId = document.getElementById('edit-client-id').value;
    const formData = new FormData(editClientForm);
    const clientData = Object.fromEntries(formData.entries());

    try {
        await fetchData(`/api/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        showStatusMessage('Client updated successfully!');
        editClientModal.style.display = 'none';
        loadClients(jobClientSelect); // Reload clients for display and job form
    } catch (error) {
        // Error message already shown by fetchData
    }
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This will also delete associated jobs.')) {
        return;
    }
    try {
        await fetchData(`/api/clients/${clientId}`, { method: 'DELETE' });
        showStatusMessage('Client deleted successfully!');
        loadClients(jobClientSelect); // Reload clients for display and job form
        loadJobs(); // Reload jobs as some might be deleted
    } catch (error) {
        // Error message already shown by fetchData
    }
}

// --- Job Management ---

async function loadJobs() {
    jobsList.innerHTML = '<p class="loading-message">Loading jobs...</p>';
    let jobs = [];
    if (navigator.onLine) {
        try {
            jobs = await fetchData('/api/jobs');
            await storeDataInIndexedDB(OBJECT_STORES.jobs, jobs); // Cache data
        } catch (error) {
            console.warn('Could not fetch jobs from network, trying IndexedDB.', error);
            jobs = await getDataFromIndexedDB(OBJECT_STORES.jobs);
            showStatusMessage('Offline: Displaying cached jobs.', false);
        }
    } else {
        jobs = await getDataFromIndexedDB(OBJECT_STORES.jobs);
        showStatusMessage('Offline: Displaying cached jobs.', false);
    }
    displayJobs(jobs);
}

function displayJobs(jobs) {
    jobsList.innerHTML = '';
    if (jobs.length === 0) {
        jobsList.innerHTML = '<p>No jobs found. Add a new job!</p>';
        return;
    }

    const filterStatus = jobStatusFilter.value;
    const filteredJobs = filterStatus === 'all' ? jobs : jobs.filter(job => job.status === filterStatus);

    if (filteredJobs.length === 0) {
        jobsList.innerHTML = `<p>No ${filterStatus.toLowerCase()} jobs found.</p>`;
        return;
    }

    filteredJobs.forEach(job => {
        const jobDiv = document.createElement('div');
        jobDiv.classList.add('data-item');
        jobDiv.innerHTML = `
            <h3>${job.service} for ${job.client_name}</h3>
            <p><strong>Date:</strong> ${job.date} at ${job.time}</p>
            <p><strong>Price:</strong> $${job.price.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="job-status-${job.status}">${job.status}</span></p>
            <p><strong>Notes:</strong> ${job.notes || 'N/A'}</p>
            <div class="actions">
                <button class="edit-btn" data-id="${job.id}">Edit</button>
                <button class="delete-btn" data-id="${job.id}">Delete</button>
                ${job.status !== 'Completed' ? `<button class="complete-btn" data-id="${job.id}">Mark Complete</button>` : ''}
            </div>
        `;
        jobsList.appendChild(jobDiv);
    });
}

async function addJob(event) {
    event.preventDefault();
    const formData = new FormData(addJobForm);
    const jobData = Object.fromEntries(formData.entries());
    jobData.price = parseFloat(jobData.price); // Ensure price is a number

    try {
        const newJob = await fetchData('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });
        showStatusMessage('Job added successfully!');
        addJobForm.reset();
        loadJobs(); // Reload jobs list
        showSection('jobs'); // Show jobs list after adding
    } catch (error) {
        // Error message already shown by fetchData
    }
}

async function editJob(event) {
    event.preventDefault();
    const jobId = document.getElementById('edit-job-id').value;
    const formData = new FormData(editJobForm);
    const jobData = Object.fromEntries(formData.entries());
    jobData.price = parseFloat(jobData.price); // Ensure price is a number

    try {
        await fetchData(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
        });
        showStatusMessage('Job updated successfully!');
        editJobModal.style.display = 'none';
        loadJobs(); // Reload jobs list
    } catch (error) {
        // Error message already shown by fetchData
    }
}

async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) {
        return;
    }
    try {
        await fetchData(`/api/jobs/${jobId}`, { method: 'DELETE' });
        showStatusMessage('Job deleted successfully!');
        loadJobs(); // Reload jobs list
    } catch (error) {
        // Error message already shown by fetchData
    }
}

async function markJobComplete(jobId) {
    if (!confirm('Mark this job as complete?')) {
        return;
    }
    try {
        // Fetch current job details to get all fields for PUT request
        const currentJobs = await getDataFromIndexedDB(OBJECT_STORES.jobs); // Get from cache
        const jobToUpdate = currentJobs.find(job => job.id == jobId);

        if (!jobToUpdate) {
            showStatusMessage('Job not found for update.', true);
            return;
        }

        // Update status
        jobToUpdate.status = 'Completed';

        await fetchData(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobToUpdate)
        });
        showStatusMessage('Job marked as complete!');
        loadJobs(); // Reload jobs list
    } catch (error) {
        // Error message already shown by fetchData
    }
}

// --- Event Listeners ---

// Navigation
navButtons.showJobs.addEventListener('click', () => { showSection('jobs'); loadJobs(); });
navButtons.showClients.addEventListener('click', () => { showSection('clients'); loadClients(); });
navButtons.showAddJob.addEventListener('click', () => { showSection('addJob'); loadClients(jobClientSelect); });
navButtons.showAddClient.addEventListener('click', () => { showSection('addClient'); });

// Form Submissions
addClientForm.addEventListener('submit', addClient);
addJobForm.addEventListener('submit', addJob);
editClientForm.addEventListener('submit', editClient);
editJobForm.addEventListener('submit', editJob);

// Dynamic List Clicks (Edit/Delete/Complete)
clientsList.addEventListener('click', async (event) => {
    const target = event.target;
    const clientId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const clients = await getDataFromIndexedDB(OBJECT_STORES.clients);
        const client = clients.find(c => c.id == clientId);
        if (client) {
            document.getElementById('edit-client-id').value = client.id;
            document.getElementById('edit-client-name').value = client.name;
            document.getElementById('edit-client-phone').value = client.phone;
            document.getElementById('edit-client-email').value = client.email;
            document.getElementById('edit-client-address').value = client.address;
            editClientModal.style.display = 'block';
        }
    } else if (target.classList.contains('delete-btn')) {
        deleteClient(clientId);
    }
});

jobsList.addEventListener('click', async (event) => {
    const target = event.target;
    const jobId = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
        const jobs = await getDataFromIndexedDB(OBJECT_STORES.jobs);
        const job = jobs.find(j => j.id == jobId);
        if (job) {
            document.getElementById('edit-job-id').value = job.id;
            document.getElementById('edit-job-date').value = job.date;
            document.getElementById('edit-job-time').value = job.time;
            document.getElementById('edit-job-service').value = job.service;
            document.getElementById('edit-job-price').value = job.price;
            document.getElementById('edit-job-status').value = job.status;
            document.getElementById('edit-job-notes').value = job.notes;

            // Populate client select for edit modal
            await loadClients(editJobClientSelect);
            editJobClientSelect.value = job.client_id; // Set selected client

            editJobModal.style.display = 'block';
        }
    } else if (target.classList.contains('delete-btn')) {
        deleteJob(jobId);
    } else if (target.classList.contains('complete-btn')) {
        markJobComplete(jobId);
    }
});

// Modal Close Buttons
document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', (event) => {
        event.target.closest('.modal').style.display = 'none';
    });
});

// Close modal if clicked outside content
window.addEventListener('click', (event) => {
    if (event.target === editJobModal) {
        editJobModal.style.display = 'none';
    }
    if (event.target === editClientModal) {
        editClientModal.style.display = 'none';
    }
});

// Job Status Filter
jobStatusFilter.addEventListener('change', loadJobs);

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    openIndexedDB().then(() => {
        loadJobs(); // Load jobs on initial page load
        loadClients(jobClientSelect); // Load clients for the add job form
    });
});

// Handle online/offline status
window.addEventListener('online', () => {
    showStatusMessage('Back online! Data will sync on next action.', false);
    // You could implement a more robust background sync here for queued writes
    loadJobs(); // Refresh data when back online
    loadClients(jobClientSelect);
});

window.addEventListener('offline', () => {
    showStatusMessage('You are offline. Data may be limited to cached content.', true);
});